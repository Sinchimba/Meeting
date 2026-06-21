#!/usr/bin/env python3
"""
Demo script for Sign Language Recognition
Shows how to use the inference service and API
"""

import sys
import argparse
import cv2
import numpy as np
from pathlib import Path
import requests
import base64
import json
from datetime import datetime

from inference import SignLanguagePredictor, RealTimeSignRecognizer
from preprocess import HandLandmarkExtractor


def encode_image_to_base64(image_path):
    """Encode image to base64 string."""
    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def demo_local_prediction():
    """Demo local prediction without API."""
    print("\n=== Local Prediction Demo ===\n")
    
    print("Initializing Sign Language Predictor...")
    predictor = SignLanguagePredictor()
    
    print("Starting webcam capture... Press 'q' to quit")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Cannot open webcam")
        return
    
    frame_count = 0
    
    while True:
        success, frame = cap.read()
        if not success:
            break
        
        # Flip for mirror effect
        frame = cv2.flip(frame, 1)
        
        # Make prediction
        prediction, landmarks = predictor.predict_from_frame(frame)
        
        # Draw landmarks
        if landmarks is not None:
            landmarks_2d = landmarks.reshape(21, 3)[:, :2]
            h, w = frame.shape[:2]
            for x, y in landmarks_2d:
                x_px = int(x * w)
                y_px = int(y * h)
                cv2.circle(frame, (x_px, y_px), 3, (0, 255, 0), -1)
        
        # Display prediction
        if prediction['sign']:
            text = f"{prediction['sign']}: {prediction['confidence']:.2f}"
            cv2.putText(frame, text, (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        cv2.imshow('Sign Language Recognition - Local', frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        
        frame_count += 1
    
    cap.release()
    cv2.destroyAllWindows()
    print(f"Processed {frame_count} frames")


def demo_api_prediction(image_path):
    """Demo API prediction."""
    print("\n=== API Prediction Demo ===\n")
    
    if not Path(image_path).exists():
        print(f"Error: Image not found: {image_path}")
        return
    
    print(f"Loading image: {image_path}")
    image_b64 = encode_image_to_base64(image_path)
    
    print("Sending prediction request to API...")
    try:
        response = requests.post(
            'http://localhost:5000/predict',
            json={'image': image_b64},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            prediction = result['prediction']
            
            print("\nPrediction Results:")
            print(f"  Sign: {prediction['sign']}")
            print(f"  Confidence: {prediction['confidence']:.4f}")
            print("\n  Top 3 Predictions:")
            for pred in prediction['top_3_predictions']:
                print(f"    - {pred['sign']}: {pred['confidence']:.4f}")
        else:
            print(f"Error: {response.status_code}")
            print(response.json())
    
    except requests.exceptions.ConnectionError:
        print("Error: Cannot connect to API. Make sure the service is running on http://localhost:5000")


def demo_video_processing(video_path):
    """Demo video processing."""
    print("\n=== Video Processing Demo ===\n")
    
    if not Path(video_path).exists():
        print(f"Error: Video not found: {video_path}")
        return
    
    print(f"Processing video: {video_path}")
    
    predictor = SignLanguagePredictor()
    predictions = predictor.predict_from_video(video_path, confidence_threshold=0.7)
    
    print(f"\nDetected {len(predictions)} signs:")
    for pred in predictions[:10]:  # Show first 10
        print(f"  Frame {pred['frame']}: {pred['sign']} ({pred['confidence']:.4f})")
    
    if len(predictions) > 10:
        print(f"  ... and {len(predictions) - 10} more")
    
    # Generate summary
    if predictions:
        sign_counts = {}
        for p in predictions:
            sign = p['sign']
            sign_counts[sign] = sign_counts.get(sign, 0) + 1
        
        print("\nSummary:")
        print(f"  Total signs: {len(predictions)}")
        print(f"  Unique signs: {len(sign_counts)}")
        print(f"  Sign distribution: {sign_counts}")


def demo_hand_detection(image_path):
    """Demo hand detection."""
    print("\n=== Hand Detection Demo ===\n")
    
    if not Path(image_path).exists():
        print(f"Error: Image not found: {image_path}")
        return
    
    print(f"Loading image: {image_path}")
    frame = cv2.imread(image_path)
    
    if frame is None:
        print("Error: Cannot read image")
        return
    
    print("Detecting hand landmarks...")
    extractor = HandLandmarkExtractor()
    landmarks_list = extractor.extract_landmarks_from_image(frame)
    
    print(f"Detected {len(landmarks_list)} hand(s)")
    
    for i, landmarks in enumerate(landmarks_list):
        print(f"\nHand {i + 1}:")
        print(f"  Landmark shape: {landmarks.shape}")
        print(f"  First 3 landmarks (x, y, z):")
        for j in range(min(3, len(landmarks))):
            print(f"    {j}: {landmarks[j*3:(j+1)*3]}")


def demo_api_health():
    """Check API health."""
    print("\n=== API Health Check ===\n")
    
    try:
        response = requests.get('http://localhost:5000/health', timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print("API Status: HEALTHY ✓")
            print(f"  Timestamp: {data['timestamp']}")
            if data.get('model_info'):
                print(f"  Model Status: {data['model_info']['status']}")
            print(f"  Available Signs: {data['config']['num_classes']}")
        else:
            print(f"API Status: ERROR (Status code: {response.status_code})")
    
    except requests.exceptions.ConnectionError:
        print("API Status: NOT RUNNING")
        print("Make sure to start the service with: python app.py")


def demo_get_signs():
    """Get list of all signs from API."""
    print("\n=== Available Signs ===\n")
    
    try:
        response = requests.get('http://localhost:5000/signs', timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            signs = data['signs']
            
            print(f"Total signs: {data['total']}\n")
            print("Recognized signs:")
            for sign, idx in sorted(signs.items(), key=lambda x: x[1]):
                print(f"  {idx:2d}. {sign}")
        else:
            print(f"Error: {response.status_code}")
    
    except requests.exceptions.ConnectionError:
        print("Error: Cannot connect to API")


def main():
    parser = argparse.ArgumentParser(description='Sign Language Recognition Demo')
    parser.add_argument('--mode', required=True,
                       choices=['local', 'api-health', 'api-predict', 'video', 
                               'detect-hands', 'list-signs'],
                       help='Demo mode to run')
    parser.add_argument('--image', help='Path to image file')
    parser.add_argument('--video', help='Path to video file')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Sign Language Recognition Demo")
    print("=" * 60)
    
    if args.mode == 'local':
        demo_local_prediction()
    
    elif args.mode == 'api-health':
        demo_api_health()
    
    elif args.mode == 'api-predict':
        if not args.image:
            print("Error: --image argument required for api-predict mode")
            sys.exit(1)
        demo_api_prediction(args.image)
    
    elif args.mode == 'video':
        if not args.video:
            print("Error: --video argument required for video mode")
            sys.exit(1)
        demo_video_processing(args.video)
    
    elif args.mode == 'detect-hands':
        if not args.image:
            print("Error: --image argument required for detect-hands mode")
            sys.exit(1)
        demo_hand_detection(args.image)
    
    elif args.mode == 'list-signs':
        demo_get_signs()
    
    print("\n" + "=" * 60)
    print("Demo Complete")
    print("=" * 60)


if __name__ == '__main__':
    main()
