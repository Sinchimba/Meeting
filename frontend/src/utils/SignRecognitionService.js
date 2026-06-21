import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import api from './axiosConfig';

export default class SignRecognitionService {
  constructor(videoElement, onSignDetected, useAIService = true) {
    this.videoElement = videoElement;
    this.onSignDetected = onSignDetected;
    this.useAIService = useAIService;
    this.hands = null;
    this.camera = null;
    this.isRunning = false;
    this.lastDetectedSign = null;
    this.lastDetectedTime = 0;
    this.aiServiceAvailable = false;

    this.initMediaPipe();
    this.checkAIService();
  }

  async checkAIService() {
    try {
      const response = await api.get('/api/ai/health');
      this.aiServiceAvailable = response.data?.status === 'healthy';
    } catch (error) {
      console.warn('AI service not available, using local recognition');
      this.aiServiceAvailable = false;
    }
  }

  initMediaPipe() {
    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    this.hands.onResults(this.onResults.bind(this));
  }

  start() {
    if (!this.isRunning && this.videoElement) {
      this.isRunning = true;
      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.isRunning && this.videoElement.readyState >= 2) {
            await this.hands.send({image: this.videoElement});
          }
        },
        width: 640,
        height: 480
      });
      this.camera.start();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.camera) {
      this.camera.stop();
    }
  }

  onResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      if (this.useAIService && this.aiServiceAvailable) {
        this.processWithAIService(results.image);
      } else {
        // Fallback to local recognition
        const sign = this.classifyGesture(results.multiHandLandmarks[0]);

        if (sign) {
          const now = Date.now();
          // Debounce: only trigger if different sign, or after 2 seconds
          if (sign !== this.lastDetectedSign || (now - this.lastDetectedTime > 2000)) {
            this.lastDetectedSign = sign;
            this.lastDetectedTime = now;
            if (this.onSignDetected) {
              this.onSignDetected(sign);
            }
          }
        }
      }
    }
  }

  async processWithAIService(image) {
    try {
      // Convert canvas/image to base64
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = image.width || 640;
      canvas.height = image.height || 480;
      ctx.drawImage(image, 0, 0);

      const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      // Send to AI service
      const response = await api.post('/api/ai/detect-sign', {
        image: base64Image
      });

      const detectedSigns = response.data?.detected_signs || [];

      if (detectedSigns.length > 0) {
        const sign = detectedSigns[0].gesture;
        const now = Date.now();

        // Debounce
        if (sign !== this.lastDetectedSign || (now - this.lastDetectedTime > 2000)) {
          this.lastDetectedSign = sign;
          this.lastDetectedTime = now;
          if (this.onSignDetected) {
            this.onSignDetected(sign);
          }
        }
      }
    } catch (error) {
      console.error('AI service error:', error);
      // Fallback to local recognition
      this.useAIService = false;
    }
  }

  classifyGesture(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;
    
    // Very basic placeholder logic for a few signs based on y-coordinates
    // Thumb: 4, Index: 8, Middle: 12, Ring: 16, Pinky: 20
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Check if fingers are raised (y is smaller when higher)
    const isIndexRaised = indexTip.y < landmarks[6].y;
    const isMiddleRaised = middleTip.y < landmarks[10].y;
    const isRingRaised = ringTip.y < landmarks[14].y;
    const isPinkyRaised = pinkyTip.y < landmarks[18].y;

    // "Hello" or "Stop" (all fingers open)
    if (isIndexRaised && isMiddleRaised && isRingRaised && isPinkyRaised) {
      return "Hello";
    }
    
    // "Yes" (fist)
    if (!isIndexRaised && !isMiddleRaised && !isRingRaised && !isPinkyRaised && thumbTip.y > indexTip.y) {
      return "Yes";
    }

    // "No" (index and middle fingers open, ring and pinky closed)
    if (isIndexRaised && isMiddleRaised && !isRingRaised && !isPinkyRaised) {
      return "No";
    }

    // Thumbs up (simplified)
    if (!isIndexRaised && !isMiddleRaised && !isRingRaised && !isPinkyRaised && thumbTip.y < indexTip.y) {
      return "Good";
    }

    return null;
  }
}
