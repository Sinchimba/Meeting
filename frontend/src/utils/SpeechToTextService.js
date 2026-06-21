export default class SpeechToTextService {
  constructor(onResultCallback, onErrorCallback) {
    this.recognition = null;
    this.isListening = false;
    this.onResultCallback = onResultCallback;
    this.onErrorCallback = onErrorCallback;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (this.onResultCallback && (finalTranscript || interimTranscript)) {
          this.onResultCallback({ finalTranscript, interimTranscript });
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (this.onErrorCallback) {
          this.onErrorCallback(event.error);
        }
      };

      this.recognition.onend = () => {
        // Automatically restart if we are supposed to be listening
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch(e) {
            console.error("Failed to restart speech recognition:", e);
          }
        }
      };
    } else {
      console.warn("SpeechRecognition API not supported in this browser.");
    }
  }

  start() {
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      try {
        this.recognition.start();
      } catch (e) {
        console.error("Error starting speech recognition:", e);
      }
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      try {
        this.recognition.stop();
      } catch(e) {
        console.error("Error stopping speech recognition:", e);
      }
    }
  }

  isSupported() {
    return !!this.recognition;
  }
}
