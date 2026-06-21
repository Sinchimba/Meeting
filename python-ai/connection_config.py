"""
Connection configuration for frontend-backend-python integration
"""

# Python AI Service endpoints
PYTHON_AI_CONFIG = {
    'base_url': 'http://localhost:5000',
    'endpoints': {
        'health': '/health',
        'predict': '/predict',
        'predict_landmarks': '/predict/landmarks',
        'detect_hands': '/detect/hands',
        'process_video': '/process-video',
        'stream': '/stream',
        'signs': '/signs',
        'train_info': '/train-info',
    },
    'timeout': {
        'health': 5,
        'predict': 10,
        'detect_hands': 10,
        'process_video': 300,  # 5 minutes for video processing
        'train_info': 5,
    }
}

# Node.js Backend configuration
NODEJS_BACKEND_CONFIG = {
    'port': 3000,
    'host': '0.0.0.0',
    'api_prefix': '/api'
}

# Frontend configuration
FRONTEND_CONFIG = {
    'url': 'http://localhost:5173',
    'api_timeout': 30000,  # 30 seconds
}
