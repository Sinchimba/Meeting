"""
Inference service for Sign Language Recognition
"""

import numpy as np
import cv2
import tensorflow as tf
from pathlib import Path
from collections import deque
import logging
import pickle
import json
from threading import Lock

from config import (
    MODEL_PATHS, SIGNS, ID_TO_SIGN, MEDIAPIPE_CONFIG,
    DETECTION_THRESHOLDS, MODEL_CONFIG
)
from preprocess import HandLandmarkExtractor, SequenceProcessor

logger = logging.getLogger(__name__)


class SignLanguagePredictor:
    """Main inference service for sign language recognition."""
    
    def __init__(self, model_path=None):
        self.model = None
        self.model_lock = Lock()
        self.extractor = HandLandmarkExtractor()
        self.processor = SequenceProcessor()
        
        # Load model
        if model_path and Path(model_path).exists():
            self.load_model(model_path)
        else:
            self.load_model(MODEL_PATHS['sequence_model'])
        
        # Initialize frame buffer for sequence processing
        self.frame_buffer = deque(maxlen=MODEL_CONFIG['sequence_length'])
        self.prediction_buffer = deque(maxlen=DETECTION_THRESHOLDS['frame_smoothing'])
    
    def load_model(self, model_path):
        """Load TensorFlow model from file."""
        try:
            model_path = Path(model_path)
            if not model_path.exists():
                logger.warning(f"Model not found at {model_path}")
                return False
            
            with self.model_lock:
                self.model = tf.keras.models.load_model(str(model_path))
            
            logger.info(f"Model loaded from {model_path}")
            return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False
    
    def predict_from_landmarks(self, landmarks_sequence):
        """
        Predict sign from a sequence of landmarks.
        
        Args:
            landmarks_sequence: Array of shape (seq_length, 63) or (seq_length, 21, 3)
        
        Returns:
            Dictionary with prediction details
        """
        if self.model is None:
            return {'sign': None, 'confidence': 0.0, 'error': 'Model not loaded'}
        
        try:
            # Prepare input
            if landmarks_sequence.shape[1] == 21:  # (seq_len, 21, 3)
                landmarks_sequence = landmarks_sequence.reshape(
                    len(landmarks_sequence), -1
                )
            
            # Normalize
            landmarks_sequence = self.processor.normalize_landmarks(
                landmarks_sequence.reshape(-1, 21, 3)
            ).reshape(landmarks_sequence.shape)
            
            # Ensure correct length
            if len(landmarks_sequence) < MODEL_CONFIG['sequence_length']:
                landmarks_sequence = self.processor.pad_sequence(
                    landmarks_sequence.reshape(-1, 63),
                    MODEL_CONFIG['sequence_length']
                )
            else:
                landmarks_sequence = landmarks_sequence[:MODEL_CONFIG['sequence_length']]
            
            # Add batch dimension
            input_data = np.expand_dims(landmarks_sequence, axis=0)
            
            # Predict
            with self.model_lock:
                predictions = self.model.predict(input_data, verbose=0)
            
            probabilities = predictions[0]
            predicted_id = np.argmax(probabilities)
            confidence = float(probabilities[predicted_id])
            predicted_sign = ID_TO_SIGN.get(predicted_id, 'unknown')
            
            # Get top 3 predictions
            top_indices = np.argsort(probabilities)[-3:][::-1]
            top_predictions = [
                {
                    'sign': ID_TO_SIGN.get(idx, 'unknown'),
                    'confidence': float(probabilities[idx])
                }
                for idx in top_indices
            ]
            
            return {
                'sign': predicted_sign,
                'confidence': confidence,
                'all_probabilities': {ID_TO_SIGN.get(i, 'unknown'): float(p) 
                                     for i, p in enumerate(probabilities)},
                'top_3_predictions': top_predictions
            }
        
        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            return {'sign': None, 'confidence': 0.0, 'error': str(e)}
    
    def predict_from_frame(self, frame):
        """
        Extract landmarks from frame and predict sign.
        
        Args:
            frame: Video frame (BGR)
        
        Returns:
            Tuple of (prediction_dict, landmarks)
        """
        landmarks_list = self.extractor.extract_landmarks_from_image(frame)
        
        if not landmarks_list:
            return {'sign': None, 'confidence': 0.0, 'error': 'No hand detected'}, None
        
        # Use first hand
        landmarks = landmarks_list[0]
        
        # Add to buffer
        self.frame_buffer.append(landmarks)
        
        # Predict if buffer is full
        if len(self.frame_buffer) == MODEL_CONFIG['sequence_length']:
            sequence = np.array(self.frame_buffer)
            prediction = self.predict_from_landmarks(sequence)
            
            # Apply smoothing
            if prediction['sign']:
                self.prediction_buffer.append(prediction['sign'])
                # Return most common sign in buffer
                smoothed_sign = max(set(self.prediction_buffer), 
                                   key=list(self.prediction_buffer).count)
                prediction['smoothed_sign'] = smoothed_sign
            
            return prediction, landmarks
        
        return {'sign': None, 'confidence': 0.0, 'info': 'Buffer not full'}, landmarks
    
    def predict_from_video(self, video_path, confidence_threshold=0.7):
        """
        Process entire video and return sign predictions.
        
        Args:
            video_path: Path to video file
            confidence_threshold: Minimum confidence for prediction
        
        Returns:
            List of predictions for each frame
        """
        cap = cv2.VideoCapture(str(video_path))
        predictions_list = []
        frame_count = 0
        
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
            
            prediction, _ = self.predict_from_frame(frame)
            
            if (prediction['sign'] and 
                prediction['confidence'] >= confidence_threshold):
                predictions_list.append({
                    'frame': frame_count,
                    'sign': prediction['sign'],
                    'confidence': prediction['confidence']
                })
            
            frame_count += 1
        
        cap.release()
        return predictions_list
    
    def get_model_info(self):
        """Get information about loaded model."""
        if self.model is None:
            return {'status': 'No model loaded'}
        
        return {
            'status': 'Model loaded',
            'input_shape': self.model.input_shape,
            'output_shape': self.model.output_shape,
            'num_parameters': self.model.count_params(),
            'signs': SIGNS
        }


class RealTimeSignRecognizer:
    """Real-time sign recognition from webcam."""
    
    def __init__(self, model_path=None, confidence_threshold=0.7):
        self.predictor = SignLanguagePredictor(model_path)
        self.confidence_threshold = confidence_threshold
        self.is_running = False
    
    def run(self, camera_id=0, display=True):
        """
        Run real-time recognition from webcam.
        
        Args:
            camera_id: Camera device ID
            display: Whether to display video
        
        Returns:
            True if successful, False otherwise
        """
        cap = cv2.VideoCapture(camera_id)
        
        if not cap.isOpened():
            logger.error("Cannot open camera")
            return False
        
        self.is_running = True
        frame_count = 0
        last_sign = None
        last_sign_count = 0
        
        try:
            while self.is_running:
                success, frame = cap.read()
                if not success:
                    break
                
                # Flip for mirror effect
                frame = cv2.flip(frame, 1)
                
                # Make prediction
                prediction, landmarks = self.predictor.predict_from_frame(frame)
                
                # Draw landmarks on frame
                if landmarks is not None:
                    # Draw circles for landmarks
                    landmarks_2d = landmarks.reshape(21, 3)[:, :2]
                    h, w = frame.shape[:2]
                    for x, y in landmarks_2d:
                        x_px = int(x * w)
                        y_px = int(y * h)
                        cv2.circle(frame, (x_px, y_px), 3, (0, 255, 0), -1)
                
                # Display prediction
                if prediction['sign'] and prediction['confidence'] >= self.confidence_threshold:
                    text = f"{prediction['sign']}: {prediction['confidence']:.2f}"
                    cv2.putText(frame, text, (10, 30),
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    
                    # Stability check
                    if prediction['sign'] == last_sign:
                        last_sign_count += 1
                    else:
                        last_sign = prediction['sign']
                        last_sign_count = 1
                
                if display:
                    cv2.imshow('Sign Language Recognition', frame)
                
                # Press 'q' to quit
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                
                frame_count += 1
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
            self.is_running = False
        
        return True
    
    def stop(self):
        """Stop real-time recognition."""
        self.is_running = False
