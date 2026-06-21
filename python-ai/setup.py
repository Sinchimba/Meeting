#!/usr/bin/env python3
"""
Setup helper script for Sign Language Recognition
Creates necessary directories and downloads sample data
"""

import os
import sys
import json
from pathlib import Path
from config import (
    DATA_DIR, MODELS_DIR, LOGS_DIR, SIGNS, API_CONFIG
)


def create_directories():
    """Create necessary directories."""
    print("Creating directories...")
    
    directories = [
        DATA_DIR,
        MODELS_DIR,
        LOGS_DIR,
        API_CONFIG['upload_folder'],
        DATA_DIR / 'training',
        DATA_DIR / 'validation',
        DATA_DIR / 'test',
    ]
    
    for dir_path in directories:
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f"  ✓ Created: {dir_path}")
    
    # Create subdirectories for each sign
    print("\nCreating sign directories...")
    for sign in SIGNS.keys():
        sign_dir = DATA_DIR / 'training' / sign
        sign_dir.mkdir(exist_ok=True)
        print(f"  ✓ Created: {sign_dir}")


def create_data_structure_template():
    """Create template for data organization."""
    print("\nCreating data structure template...")
    
    template = {
        "data_structure": {
            "training": {
                "[sign_name]": "Place video files here (*.mp4)",
                "[sign_name]/": "One directory per sign"
            },
            "validation": "Optional validation data",
            "test": "Optional test data"
        },
        "file_format": {
            "video": "MP4, AVI, MOV, MKV",
            "min_duration": "2-3 seconds",
            "recommended_fps": 30,
            "recommended_resolution": "640x480"
        },
        "example_structure": "data/training/hello/hello_video1.mp4"
    }
    
    template_file = DATA_DIR / 'DATA_STRUCTURE.json'
    with open(template_file, 'w') as f:
        json.dump(template, f, indent=2)
    
    print(f"  ✓ Created: {template_file}")


def create_config_guide():
    """Create configuration guide."""
    print("\nCreating configuration guide...")
    
    guide = """# Configuration Guide

## Key Settings (config.py)

### Model Configuration
- sequence_length: Number of frames per sequence (default: 30)
- num_classes: Number of sign classes (default: 26)
- lstm_units: Number of LSTM units (default: 128)
- dropout_rate: Dropout rate (default: 0.5)
- epochs: Training epochs (default: 100)
- batch_size: Batch size (default: 32)

### Adding New Signs
1. Open config.py
2. Add to SIGNS dictionary:
   'new_sign_name': [next_available_id]
3. Update num_classes if needed
4. Create training data directory: data/training/new_sign_name/

### Detection Thresholds
- confidence: Minimum confidence for prediction (default: 0.7)
- frame_smoothing: Number of frames for smoothing (default: 5)

### MediaPipe Settings
- min_detection_confidence: Hand detection threshold (default: 0.7)
- min_tracking_confidence: Landmark tracking threshold (default: 0.7)
- max_num_hands: Maximum hands to detect (default: 2)

## API Configuration
- host: API server host (default: 0.0.0.0)
- port: API server port (default: 5000)
- debug: Enable debug mode (default: False)

## Environment Variables
- FLASK_HOST: Override API host
- FLASK_PORT: Override API port
- FLASK_DEBUG: Enable/disable debug mode
"""
    
    guide_file = Path('CONFIG_GUIDE.md')
    with open(guide_file, 'w') as f:
        f.write(guide)
    
    print(f"  ✓ Created: {guide_file}")


def create_training_guide():
    """Create training guide."""
    print("\nCreating training guide...")
    
    guide = """# Training Guide

## Prerequisites
1. Prepare training data (see DATA_STRUCTURE.json)
2. Ensure all dependencies are installed
3. Verify model directory structure

## Quick Start

### Basic Training
```bash
python train.py --data-dir ./data/training
```

### With Custom Settings
```bash
python train.py \\
  --data-dir ./data/training \\
  --model-type cnn_lstm \\
  --epochs 150 \\
  --batch-size 32 \\
  --augment
```

## Available Models

### LSTM Model (Default)
- Pros: Fast, good for real-time
- Cons: Less feature extraction
- Best for: Real-time applications

### CNN-LSTM Model
- Pros: Better features, good balance
- Cons: Slower than LSTM
- Best for: Balanced accuracy/speed

### Attention Model
- Pros: Best accuracy
- Cons: Slowest inference
- Best for: Offline processing

## Training Tips

1. **Data Quality**: Use clear, well-lit recordings
2. **Augmentation**: Enable for smaller datasets
3. **Batch Size**: Larger batches = more stable training
4. **Learning Rate**: Adjust if loss doesn't decrease
5. **Validation Split**: Use 20% for validation
6. **Early Stopping**: Training will stop if validation doesn't improve

## Monitoring Training

- Check logs in: logs/[model_name]/
- Training history saved as: logs/training_history_*.png
- Model metrics saved as: models/[model_name]_metadata.json

## Saving Custom Models

Models are automatically saved to:
- models/[model_type]_model.h5
- models/[model_type]_model_metadata.json

## Troubleshooting

### Out of Memory
- Reduce batch_size: --batch-size 16
- Use smaller model: --model-type lstm

### Low Accuracy
- Use more training data
- Enable augmentation: --augment
- Try different model: --model-type cnn_lstm

### Slow Training
- Use GPU if available
- Reduce epochs: --epochs 50
- Reduce data size
"""
    
    guide_file = Path('TRAINING_GUIDE.md')
    with open(guide_file, 'w') as f:
        f.write(guide)
    
    print(f"  ✓ Created: {guide_file}")


def create_api_examples():
    """Create API usage examples."""
    print("\nCreating API examples...")
    
    examples = """# API Usage Examples

## Python Client

```python
import requests
import base64
import cv2

# Read image
frame = cv2.imread('image.jpg')
_, buffer = cv2.imencode('.jpg', frame)
image_b64 = base64.b64encode(buffer).decode()

# Predict
response = requests.post('http://localhost:5000/predict',
    json={'image': image_b64})
result = response.json()
print(f"Sign: {result['prediction']['sign']}")
```

## JavaScript/Fetch

```javascript
// Encode image to base64
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();

img.onload = () => {
  ctx.drawImage(img, 0, 0);
  const imageData = canvas.toDataURL('image/jpeg').split(',')[1];
  
  fetch('/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageData })
  })
  .then(r => r.json())
  .then(data => console.log('Sign:', data.prediction.sign));
};
```

## cURL

```bash
# Get health status
curl http://localhost:5000/health

# Get available signs
curl http://localhost:5000/signs

# List sign details
curl http://localhost:5000/sign/hello

# Process video file
curl -F "file=@video.mp4" \\
     http://localhost:5000/process-video
```

## Response Examples

### Successful Prediction
```json
{
  "success": true,
  "prediction": {
    "sign": "hello",
    "confidence": 0.95,
    "top_3_predictions": [
      {"sign": "hello", "confidence": 0.95},
      {"sign": "goodbye", "confidence": 0.03},
      {"sign": "good", "confidence": 0.02}
    ]
  },
  "timestamp": "2024-05-10T10:30:00"
}
```

### Hand Detection
```json
{
  "success": true,
  "landmarks": [
    [[0.5, 0.3, 0.0], [0.51, 0.32, 0.01], ...],
    [[0.3, 0.4, 0.0], [0.31, 0.42, 0.01], ...]
  ],
  "num_hands": 2
}
```

### Video Processing
```json
{
  "success": true,
  "predictions": [
    {"frame": 0, "sign": "hello", "confidence": 0.95},
    {"frame": 30, "sign": "goodbye", "confidence": 0.92}
  ],
  "summary": {
    "total_predictions": 2,
    "unique_signs": 2,
    "sign_distribution": {"hello": 1, "goodbye": 1},
    "most_common_sign": "hello"
  }
}
```
"""
    
    examples_file = Path('API_EXAMPLES.md')
    with open(examples_file, 'w') as f:
        f.write(examples)
    
    print(f"  ✓ Created: {examples_file}")


def main():
    print("=" * 60)
    print("Sign Language Recognition - Setup")
    print("=" * 60)
    print()
    
    try:
        create_directories()
        create_data_structure_template()
        create_config_guide()
        create_training_guide()
        create_api_examples()
        
        print("\n" + "=" * 60)
        print("Setup Complete! ✓")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. Review CONFIG_GUIDE.md for settings")
        print("2. Prepare training data (see DATA_STRUCTURE.json)")
        print("3. Train model: python train.py --data-dir ./data/training")
        print("4. Run service: python app.py")
        print("5. Test with: python demo.py --mode api-health")
        print()
        
    except Exception as e:
        print(f"Error during setup: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
