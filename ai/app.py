#!/usr/bin/env python3
"""
Sign Language Recognition AI Service
Provides REST API endpoints for real-time sign language recognition.
Integrates with MediaPipe for hand detection and TensorFlow for classification.
"""

import cv2
import numpy as np
import base64
import io
import logging
import json
import os
from datetime import datetime
from pathlib import Path
from threading import Lock

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from config import (
    API_CONFIG, MODEL_PATHS, SIGNS, ID_TO_SIGN,
    DETECTION_THRESHOLDS, MODEL_CONFIG, LOGS_DIR
)
from inference import SignLanguagePredictor, RealTimeSignRecognizer
from preprocess import HandLandmarkExtractor
from utils import setup_logging

# Setup Flask app
app = Flask(__name__)
CORS(app)

# Setup logging
logger = setup_logging(LOGS_DIR)
logger.setLevel(logging.INFO)

# Global state
predictor = None
predictor_lock = Lock()
request_count = 0
request_lock = Lock()

# Upload configuration
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB


def initialize_predictor():
    """Initialize the sign language predictor."""
    global predictor
    
    if predictor is None:
        with predictor_lock:
            if predictor is None:
                logger.info("Initializing Sign Language Predictor...")
                try:
                    predictor = SignLanguagePredictor(MODEL_PATHS['sequence_model'])
                    logger.info("Predictor initialized successfully")
                except Exception as e:
                    logger.error(f"Error initializing predictor: {e}")
                    predictor = None
    
    return predictor


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    try:
        pred = initialize_predictor()
        status = 'healthy' if pred is not None else 'unhealthy'
        model_info = pred.get_model_info() if pred else None
        
        return jsonify({
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'model_info': model_info,
            'config': {
                'sequence_length': MODEL_CONFIG['sequence_length'],
                'num_classes': MODEL_CONFIG['num_classes'],
                'signs': SIGNS
            }
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500


@app.route('/status', methods=['GET'])
def get_status():
    """Get current service status."""
    return jsonify({
        'service': 'Sign Language Recognition AI',
        'version': '1.0.0',
        'status': 'running',
        'timestamp': datetime.now().isoformat(),
        'available_signs': len(SIGNS),
        'signs': SIGNS
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict sign from image frame.
    
    Expected input:
    {
        "image": "base64_encoded_image"
    }
    
    Returns:
    {
        "sign": "hello",
        "confidence": 0.95,
        "top_3_predictions": [...]
    }
    """
    try:
        global request_count
        with request_lock:
            request_count += 1
        
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Decode image
        image_data = base64.b64decode(data['image'])
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'error': 'Invalid image'}), 400
        
        # Initialize predictor
        pred = initialize_predictor()
        if pred is None:
            return jsonify({'error': 'Predictor not available'}), 503
        
        # Make prediction
        prediction, landmarks = pred.predict_from_frame(frame)
        
        return jsonify({
            'success': True,
            'prediction': prediction,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/predict/landmarks', methods=['POST'])
def predict_from_landmarks():
    """
    Predict sign from hand landmarks.
    
    Expected input:
    {
        "landmarks": [[x, y, z], ...],  # 21 landmarks
        "sequence_mode": true/false     # If true, expects sequence of landmarks
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'landmarks' not in data:
            return jsonify({'error': 'No landmarks provided'}), 400
        
        landmarks = np.array(data['landmarks'])
        sequence_mode = data.get('sequence_mode', False)
        
        pred = initialize_predictor()
        if pred is None:
            return jsonify({'error': 'Predictor not available'}), 503
        
        if sequence_mode:
            # Expect shape (seq_length, 21, 3) or (seq_length, 63)
            if landmarks.shape[1] == 21 and len(landmarks.shape) == 3:
                landmarks = landmarks.reshape(len(landmarks), -1)
        
        prediction = pred.predict_from_landmarks(landmarks)
        
        return jsonify({
            'success': True,
            'prediction': prediction,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Landmark prediction error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/detect/hands', methods=['POST'])
def detect_hands():
    """
    Detect hand landmarks in image.
    
    Expected input:
    {
        "image": "base64_encoded_image"
    }
    
    Returns:
    {
        "landmarks": [[[x, y, z], ...], ...],  # List of hands
        "num_hands": 2,
        "confidence": 0.95
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Decode image
        image_data = base64.b64decode(data['image'])
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'error': 'Invalid image'}), 400
        
        # Extract landmarks
        extractor = HandLandmarkExtractor()
        landmarks_list = extractor.extract_landmarks_from_image(frame)
        
        return jsonify({
            'success': True,
            'landmarks': [l.tolist() if isinstance(l, np.ndarray) else l 
                         for l in landmarks_list],
            'num_hands': len(landmarks_list),
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Hand detection error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/process-video', methods=['POST'])
def process_video():
    """
    Process uploaded video file and return sign predictions.
    
    Expected input:
    - file: video file (multipart/form-data)
    - confidence_threshold: minimum confidence (optional)
    
    Returns:
    {
        "predictions": [
            {"frame": 0, "sign": "hello", "confidence": 0.95},
            ...
        ],
        "summary": {...}
    }
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_UPLOAD_SIZE:
            return jsonify({'error': f'File too large. Max size: {MAX_UPLOAD_SIZE} bytes'}), 413
        
        # Save temporarily
        filename = secure_filename(file.filename)
        temp_path = API_CONFIG['upload_folder'] / f"temp_{datetime.now().timestamp()}_{filename}"
        file.save(str(temp_path))
        
        try:
            pred = initialize_predictor()
            if pred is None:
                return jsonify({'error': 'Predictor not available'}), 503
            
            confidence_threshold = float(request.form.get('confidence_threshold', 0.7))
            
            # Process video
            predictions = pred.predict_from_video(str(temp_path), confidence_threshold)
            
            # Generate summary
            if predictions:
                sign_counts = {}
                for p in predictions:
                    sign = p['sign']
                    sign_counts[sign] = sign_counts.get(sign, 0) + 1
                
                most_common = max(sign_counts.items(), key=lambda x: x[1])
                summary = {
                    'total_predictions': len(predictions),
                    'unique_signs': len(sign_counts),
                    'sign_distribution': sign_counts,
                    'most_common_sign': most_common[0],
                    'most_common_count': most_common[1]
                }
            else:
                summary = {
                    'total_predictions': 0,
                    'message': 'No signs detected above confidence threshold'
                }
            
            return jsonify({
                'success': True,
                'predictions': predictions,
                'summary': summary,
                'timestamp': datetime.now().isoformat()
            })
        
        finally:
            # Clean up temp file
            if temp_path.exists():
                temp_path.unlink()
    
    except Exception as e:
        logger.error(f"Video processing error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/train-info', methods=['GET'])
def training_info():
    """Get training and model information."""
    return jsonify({
        'model_config': MODEL_CONFIG,
        'signs': SIGNS,
        'signs_count': len(SIGNS),
        'model_paths': {k: str(v) for k, v in MODEL_PATHS.items()},
        'detection_thresholds': DETECTION_THRESHOLDS
    })


@app.route('/signs', methods=['GET'])
def get_signs():
    """Get list of all recognized signs."""
    return jsonify({
        'signs': SIGNS,
        'id_to_sign': ID_TO_SIGN,
        'total': len(SIGNS)
    })


@app.route('/sign/<sign_name>', methods=['GET'])
def get_sign_info(sign_name):
    """Get information about a specific sign."""
    sign_name = sign_name.lower().replace(' ', '_')
    
    if sign_name not in SIGNS:
        return jsonify({'error': f'Sign "{sign_name}" not found'}), 404
    
    return jsonify({
        'sign': sign_name,
        'id': SIGNS[sign_name],
        'description': f'Sign language gesture for "{sign_name}"'
    })


@app.route('/stream', methods=['GET'])
def stream_recognition():
    """
    Stream real-time recognition from webcam.
    Returns MJPEG stream.
    """
    def generate_frames():
        recognizer = RealTimeSignRecognizer(confidence_threshold=0.7)
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            logger.error("Cannot open camera")
            return
        
        try:
            pred = initialize_predictor()
            if pred is None:
                return
            
            while True:
                success, frame = cap.read()
                if not success:
                    break
                
                # Make prediction
                prediction, landmarks = pred.predict_from_frame(frame)
                
                # Draw landmarks and prediction on frame
                if landmarks is not None:
                    landmarks_2d = landmarks.reshape(21, 3)[:, :2]
                    h, w = frame.shape[:2]
                    for x, y in landmarks_2d:
                        x_px = int(x * w)
                        y_px = int(y * h)
                        cv2.circle(frame, (x_px, y_px), 3, (0, 255, 0), -1)
                
                if (prediction['sign'] and 
                    prediction['confidence'] >= DETECTION_THRESHOLDS['confidence']):
                    text = f"{prediction['sign']}: {prediction['confidence']:.2f}"
                    cv2.putText(frame, text, (10, 30),
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                
                # Encode frame
                ret, buffer = cv2.imencode('.jpg', frame)
                frame_bytes = buffer.tobytes()
                
                yield (b'--frame\r\n'
                      b'Content-Type: image/jpeg\r\n'
                      b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n'
                      + frame_bytes + b'\r\n')
        
        finally:
            cap.release()
    
    return app.response_class(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


@app.route('/stats', methods=['GET'])
def get_stats():
    """Get service statistics."""
    global request_count
    
    return jsonify({
        'total_requests': request_count,
        'timestamp': datetime.now().isoformat(),
        'uptime': 'running',
        'model_status': 'loaded' if predictor else 'not_loaded'
    })


@app.route('/api/health', methods=['GET'])
def api_health():
    """Health check for compatibility."""
    return health_check()


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    logger.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    # Initialize predictor on startup
    initialize_predictor()
    
    # Start Flask server
    logger.info(f"Starting Sign Language Recognition Service on {API_CONFIG['host']}:{API_CONFIG['port']}")
    app.run(
        host=API_CONFIG['host'],
        port=API_CONFIG['port'],
        debug=API_CONFIG['debug'],
        threaded=True
    )
    app.run(host='0.0.0.0', port=5000, debug=True)