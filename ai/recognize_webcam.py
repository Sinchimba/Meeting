#!/usr/bin/env python3
"""
Real-time Sign Language Recognition from Webcam
Press 'q' to quit, 's' to save statistics
"""

import cv2
import logging
from inference import SignLanguagePredictor
from config import DETECTION_THRESHOLDS

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    logger.info("Initializing predictor...")
    predictor = SignLanguagePredictor()
    
    logger.info("Opening webcam...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        logger.error("Cannot open webcam")
        return
    
    logger.info("Starting real-time recognition (press 'q' to quit)...")
    
    frame_count = 0
    sign_history = []
    
    while True:
        success, frame = cap.read()
        if not success:
            break
        
        # Flip for mirror effect
        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        
        # Make prediction
        prediction, landmarks = predictor.predict_from_frame(frame)
        
        # Draw landmarks on frame
        if landmarks is not None:
            landmarks_2d = landmarks.reshape(21, 3)[:, :2]
            for x, y in landmarks_2d:
                x_px = int(x * w)
                y_px = int(y * h)
                cv2.circle(frame, (x_px, y_px), 3, (0, 255, 0), -1)
        
        # Display prediction
        if prediction['sign'] and prediction['confidence'] >= DETECTION_THRESHOLDS['confidence']:
            sign = prediction['sign']
            confidence = prediction['confidence']
            
            text = f"{sign}: {confidence:.2f}"
            cv2.putText(frame, text, (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            sign_history.append(sign)
        else:
            cv2.putText(frame, "No sign detected", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        
        # Display frame count
        cv2.putText(frame, f"Frame: {frame_count}", (10, h - 20),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
        
        # Show frame
        cv2.imshow('Sign Language Recognition', frame)
        
        # Handle key presses
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            # Save statistics
            if sign_history:
                logger.info(f"\n=== Statistics ===")
                logger.info(f"Frames processed: {frame_count}")
                logger.info(f"Signs detected: {len(sign_history)}")
                
                sign_counts = {}
                for sign in sign_history:
                    sign_counts[sign] = sign_counts.get(sign, 0) + 1
                
                logger.info(f"Unique signs: {len(sign_counts)}")
                logger.info(f"\nSign distribution:")
                for sign, count in sorted(sign_counts.items(), key=lambda x: -x[1]):
                    logger.info(f"  {sign}: {count} times")
        
        frame_count += 1
    
    cap.release()
    cv2.destroyAllWindows()
    
    logger.info(f"Processed {frame_count} frames")
    if sign_history:
        logger.info(f"Detected {len(sign_history)} signs")


if __name__ == '__main__':
    main()
