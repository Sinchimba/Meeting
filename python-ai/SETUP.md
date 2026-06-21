# Sign Language Recognition - Quick Setup Guide

## Installation (5 minutes)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Initialize Setup
```bash
python setup.py
```

This creates necessary directories and configuration files.

## Getting Started (3 ways)

### Option 1: Run the API Service
```bash
python app.py
```
- Service runs on: http://localhost:5000
- Use for: Web/mobile integration, REST API calls
- Check health: `curl http://localhost:5000/health`

### Option 2: Real-time Webcam Recognition
```bash
python recognize_webcam.py
```
- Press 'q' to quit
- Press 's' to show statistics
- Use for: Live testing and demos

### Option 3: Run Demos
```bash
# Check API health
python demo.py --mode api-health

# List available signs
python demo.py --mode list-signs

# Real-time webcam (local inference)
python demo.py --mode local

# Detect hands in image
python demo.py --mode detect-hands --image image.jpg

# Process video file
python demo.py --mode video --video video.mp4
```

## Train Your Own Model

### 1. Prepare Data
```
data/training/
├── hello/
│   ├── hello_001.mp4
│   ├── hello_002.mp4
│   └── ...
├── goodbye/
│   ├── goodbye_001.mp4
│   └── ...
└── ... (other signs)
```

### 2. Train Model
```bash
# Basic training
python train.py --data-dir ./data/training

# With augmentation and custom settings
python train.py \
  --data-dir ./data/training \
  --model-type cnn_lstm \
  --epochs 150 \
  --augment
```

### 3. Run with Trained Model
The trained model is automatically used by the service.

## API Quick Reference

### Predict Sign from Image
```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_image_data"}'
```

### Detect Hand Landmarks
```bash
curl -X POST http://localhost:5000/detect/hands \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_image_data"}'
```

### Process Video File
```bash
curl -X POST http://localhost:5000/process-video \
  -F "file=@video.mp4" \
  -F "confidence_threshold=0.7"
```

### Get Available Signs
```bash
curl http://localhost:5000/signs
```

### Get Health Status
```bash
curl http://localhost:5000/health
```

## System Requirements

- **Python**: 3.8+
- **RAM**: 8GB minimum
- **Storage**: 500MB for models and dependencies
- **GPU**: Optional (recommended for faster training)

## Configuration

Edit `config.py` to customize:
- Number of signs
- Model parameters
- Detection thresholds
- API settings

## File Structure

```
python-ai/
├── app.py              # REST API service
├── train.py            # Training script
├── inference.py        # Prediction service
├── recognize_webcam.py # Live webcam demo
├── demo.py             # Demo scripts
├── setup.py            # Setup helper
├── config.py           # Configuration
├── models.py           # Neural networks
├── preprocess.py       # Data preprocessing
├── utils.py            # Utilities
├── requirements.txt    # Dependencies
├── README.md           # Full documentation
├── data/               # Training data
├── models/             # Saved models
└── logs/               # Training logs
```

## Common Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Initialize directories
python setup.py

# Start API service
python app.py

# Run live webcam recognition
python recognize_webcam.py

# Train model
python train.py --data-dir ./data/training

# Run demo
python demo.py --mode local

# Check logs
tail -f logs/training.log
```

## Troubleshooting

### "No module named 'tensorflow'"
```bash
pip install tensorflow
```

### "No module named 'mediapipe'"
```bash
pip install mediapipe
```

### "Cannot open camera"
- Ensure camera is connected
- Check camera permissions
- Try: `ls /dev/video*` (Linux)

### "Cannot connect to API"
- Make sure `python app.py` is running
- Check if port 5000 is available
- Try: `sudo lsof -i :5000`

## Next Steps

1. ✓ Run `python setup.py` to initialize
2. ✓ Test with `python recognize_webcam.py`
3. ✓ Read [README.md](README.md) for full documentation
4. ✓ Check [TRAINING_GUIDE.md](TRAINING_GUIDE.md) to train models
5. ✓ Review [API_EXAMPLES.md](API_EXAMPLES.md) for API usage

## Support

- Check logs in `logs/` directory
- See full README: `cat README.md`
- See training guide: `cat TRAINING_GUIDE.md`
- See API examples: `cat API_EXAMPLES.md`

## License

Part of the Mute application
