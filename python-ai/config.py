"""
Configuration for Sign Language Recognition System
"""

import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
LOGS_DIR = BASE_DIR / "logs"

# Create directories if they don't exist
for dir_path in [DATA_DIR, MODELS_DIR, LOGS_DIR]:
    dir_path.mkdir(exist_ok=True)

# Model configuration
MODEL_CONFIG = {
    'input_shape': (21, 3),  # 21 hand landmarks with x, y, z coordinates
    'sequence_length': 30,  # Number of frames for sequence
    'num_classes': 26,  # 26 ASL letters (A-Z)
    'lstm_units': 128,
    'dropout_rate': 0.5,
    'batch_size': 32,
    'epochs': 100,
    'learning_rate': 0.001,
    'validation_split': 0.2,
}

# Sign language definitions
SIGNS = {
    'hello': 0,
    'goodbye': 1,
    'yes': 2,
    'no': 3,
    'thank_you': 4,
    'please': 5,
    'help': 6,
    'love': 7,
    'sorry': 8,
    'good': 9,
    'bad': 10,
    'ok': 11,
    'water': 12,
    'food': 13,
    'friend': 14,
    'family': 15,
    'work': 16,
    'home': 17,
    'sleep': 18,
    'happy': 19,
    'sad': 20,
    'angry': 21,
    'confused': 22,
    'tired': 23,
    'excited': 24,
    'calm': 25,
}

# Reverse mapping for predictions
ID_TO_SIGN = {v: k for k, v in SIGNS.items()}

# MediaPipe configuration
MEDIAPIPE_CONFIG = {
    'min_detection_confidence': 0.7,
    'min_tracking_confidence': 0.7,
    'max_num_hands': 2,
}

# API configuration
API_CONFIG = {
    'host': os.getenv('FLASK_HOST', '0.0.0.0'),
    'port': int(os.getenv('FLASK_PORT', 5000)),
    'debug': os.getenv('FLASK_DEBUG', 'False') == 'True',
    'upload_folder': BASE_DIR / 'uploads',
}

# Make upload folder
API_CONFIG['upload_folder'].mkdir(exist_ok=True)

# Model paths
MODEL_PATHS = {
    'gesture_model': MODELS_DIR / 'gesture_recognizer.h5',
    'sequence_model': MODELS_DIR / 'sequence_recognizer.h5',
    'scaler': MODELS_DIR / 'scaler.pkl',
    'labelencoder': MODELS_DIR / 'labelencoder.pkl',
}

# Thresholds for detection
DETECTION_THRESHOLDS = {
    'confidence': 0.7,
    'sequence_confidence': 0.8,
    'frame_smoothing': 5,  # Number of frames for smoothing
}

# Data augmentation settings
DATA_AUGMENTATION = {
    'rotation_range': 15,
    'shift_range': 0.1,
    'zoom_range': 0.2,
    'flip_horizontal': True,
}
