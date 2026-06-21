"""
Data Preprocessing for Sign Language Recognition
"""

import numpy as np
import cv2
import mediapipe as mp
from pathlib import Path
from collections import deque
import json
from config import MODEL_CONFIG, SIGNS, MEDIAPIPE_CONFIG, DATA_AUGMENTATION


class HandLandmarkExtractor:
    """Extract hand landmarks from video frames using MediaPipe."""
    
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=MEDIAPIPE_CONFIG['min_detection_confidence'],
            min_tracking_confidence=MEDIAPIPE_CONFIG['min_tracking_confidence']
        )
    
    def extract_landmarks_from_image(self, image):
        """
        Extract hand landmarks from a single image.
        
        Args:
            image: Image frame (BGR format from OpenCV)
        
        Returns:
            List of landmarks for each detected hand
        """
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_image)
        
        landmarks_list = []
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                landmarks = []
                for landmark in hand_landmarks.landmark:
                    landmarks.extend([landmark.x, landmark.y, landmark.z])
                landmarks_list.append(np.array(landmarks))
        
        return landmarks_list
    
    def extract_landmarks_from_video(self, video_path, max_frames=None):
        """
        Extract landmarks from all frames in a video.
        
        Args:
            video_path: Path to video file
            max_frames: Maximum number of frames to extract (None for all)
        
        Returns:
            List of landmark arrays for each frame
        """
        cap = cv2.VideoCapture(str(video_path))
        landmarks_sequence = []
        frame_count = 0
        
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
            
            if max_frames and frame_count >= max_frames:
                break
            
            landmarks = self.extract_landmarks_from_image(frame)
            if landmarks:
                # Use first hand if multiple are detected
                landmarks_sequence.append(landmarks[0])
            
            frame_count += 1
        
        cap.release()
        return np.array(landmarks_sequence)


class SequenceProcessor:
    """Process landmark sequences for model input."""
    
    @staticmethod
    def pad_sequence(sequence, target_length=30, pad_value=0):
        """
        Pad or truncate sequence to target length.
        
        Args:
            sequence: Landmark sequence
            target_length: Target sequence length
            pad_value: Value for padding
        
        Returns:
            Padded/truncated sequence
        """
        current_length = len(sequence)
        
        if current_length >= target_length:
            return sequence[:target_length]
        else:
            padding = np.full((target_length - current_length, sequence.shape[1]), pad_value)
            return np.vstack([sequence, padding])
    
    @staticmethod
    def normalize_landmarks(landmarks, center_on_wrist=True):
        """
        Normalize landmarks (scale and translate).
        
        Args:
            landmarks: Landmark array (21, 3)
            center_on_wrist: Whether to center on wrist (first landmark)
        
        Returns:
            Normalized landmarks
        """
        landmarks = landmarks.copy()
        
        if center_on_wrist and len(landmarks) > 0:
            # Center on wrist (landmark 0)
            landmarks = landmarks - landmarks[0]
        
        # Scale to [-1, 1] range
        max_dist = np.max(np.abs(landmarks))
        if max_dist > 0:
            landmarks = landmarks / max_dist
        
        return landmarks
    
    @staticmethod
    def smooth_sequence(sequence, window_size=5):
        """
        Apply temporal smoothing to landmark sequence.
        
        Args:
            sequence: Landmark sequence
            window_size: Size of smoothing window
        
        Returns:
            Smoothed sequence
        """
        if len(sequence) < window_size:
            return sequence
        
        smoothed = []
        half_window = window_size // 2
        
        for i in range(len(sequence)):
            start = max(0, i - half_window)
            end = min(len(sequence), i + half_window + 1)
            smoothed.append(np.mean(sequence[start:end], axis=0))
        
        return np.array(smoothed)
    
    @staticmethod
    def augment_sequence(sequence, rotation_range=15, shift_range=0.1, zoom_range=0.2):
        """
        Apply data augmentation to landmark sequence.
        
        Args:
            sequence: Landmark sequence
            rotation_range: Rotation range in degrees
            shift_range: Shift range as fraction
            zoom_range: Zoom range as fraction
        
        Returns:
            Augmented sequence
        """
        augmented = sequence.copy()
        
        # Random rotation
        angle = np.random.uniform(-rotation_range, rotation_range)
        cos_a, sin_a = np.cos(np.radians(angle)), np.sin(np.radians(angle))
        
        for i in range(len(augmented)):
            x, y = augmented[i, 0], augmented[i, 1]
            augmented[i, 0] = x * cos_a - y * sin_a
            augmented[i, 1] = x * sin_a + y * cos_a
        
        # Random shift
        shift_x = np.random.uniform(-shift_range, shift_range)
        shift_y = np.random.uniform(-shift_range, shift_range)
        augmented[:, 0] += shift_x
        augmented[:, 1] += shift_y
        
        # Random zoom
        zoom = np.random.uniform(1 - zoom_range, 1 + zoom_range)
        augmented[:, :2] *= zoom
        
        return augmented


class DataProcessor:
    """Main data processing pipeline."""
    
    def __init__(self, sequence_length=30):
        self.sequence_length = sequence_length
        self.extractor = HandLandmarkExtractor()
        self.processor = SequenceProcessor()
    
    def process_video_file(self, video_path, sign_label, augment=False, augment_count=1):
        """
        Process a single video file into training samples.
        
        Args:
            video_path: Path to video file
            sign_label: Sign label
            augment: Whether to apply augmentation
            augment_count: Number of augmented samples to generate
        
        Returns:
            List of (sequence, label) tuples
        """
        samples = []
        
        # Extract landmarks
        landmarks = self.extractor.extract_landmarks_from_video(str(video_path))
        
        if len(landmarks) == 0:
            return samples
        
        # Process sequence
        landmarks = self.processor.smooth_sequence(landmarks)
        landmarks = self.processor.pad_sequence(landmarks, self.sequence_length)
        landmarks = self.processor.normalize_landmarks(landmarks)
        
        # Flatten for input
        sequence = landmarks.flatten()
        samples.append((sequence, sign_label))
        
        # Generate augmented samples
        if augment:
            for _ in range(augment_count):
                aug_landmarks = self.processor.augment_sequence(
                    landmarks.reshape(self.sequence_length, 21, 3),
                    **DATA_AUGMENTATION
                )
                aug_sequence = aug_landmarks.flatten()
                samples.append((aug_sequence, sign_label))
        
        return samples
    
    def process_video_directory(self, data_dir, augment=False, augment_count=1):
        """
        Process all videos in a directory structure.
        Directory structure should be: data_dir/sign_label/video_files.mp4
        
        Args:
            data_dir: Root data directory
            augment: Whether to apply augmentation
            augment_count: Number of augmented samples per video
        
        Returns:
            Tuple of (sequences array, labels array)
        """
        all_sequences = []
        all_labels = []
        data_dir = Path(data_dir)
        
        for sign_dir in sorted(data_dir.iterdir()):
            if not sign_dir.is_dir():
                continue
            
            sign_label = sign_dir.name
            if sign_label not in SIGNS:
                print(f"Warning: Unknown sign label '{sign_label}'")
                continue
            
            label_id = SIGNS[sign_label]
            print(f"Processing sign: {sign_label} (ID: {label_id})")
            
            for video_file in sorted(sign_dir.glob('*.mp4')):
                print(f"  Processing {video_file.name}...")
                samples = self.process_video_file(
                    video_file, label_id, augment, augment_count
                )
                
                for sequence, label in samples:
                    all_sequences.append(sequence)
                    all_labels.append(label)
        
        return np.array(all_sequences), np.array(all_labels)
