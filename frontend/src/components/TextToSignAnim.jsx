import React, { useState, useEffect } from 'react';
import './TextToSignAnim.css';

// A mock dictionary mapping words to sign language GIF/Video URLs
// In a real app, this would be a comprehensive database
const SIGN_DICTIONARY = {
  "hello": "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif",
  "yes": "https://media.giphy.com/media/26AHteTfafcdKC6ys/giphy.gif",
  "no": "https://media.giphy.com/media/3o7TKwmnVcWcgKbCh2/giphy.gif",
  "thank you": "https://media.giphy.com/media/l41lO5sLpswR3g3wA/giphy.gif",
  "good": "https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif",
  "morning": "https://media.giphy.com/media/3o7TKxOzWkgxIIMvwQ/giphy.gif"
};

const DEFAULT_SIGN = "https://media.giphy.com/media/3o7TKUM3IgHTX2WINy/giphy.gif"; // "Thinking" or waiting sign

export default function TextToSignAnim({ transcript }) {
  const [currentWord, setCurrentWord] = useState('');
  const [currentAnim, setCurrentAnim] = useState(DEFAULT_SIGN);
  const [queue, setQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Parse new transcript into words and add to queue
  useEffect(() => {
    if (transcript) {
      // Very simple parsing: replace punctuation and split by spaces
      const cleanedText = transcript.replace(/[.,!?]/g, '').trim();
      if (cleanedText) {
        const words = cleanedText.toLowerCase().split(/\s+/);
        setQueue(prev => [...prev, ...words]);
      }
    }
  }, [transcript]);

  // Process the queue
  useEffect(() => {
    if (queue.length > 0 && !isPlaying) {
      playNextWord();
    }
  }, [queue, isPlaying]);

  const playNextWord = () => {
    if (queue.length === 0) {
      setIsPlaying(false);
      setCurrentWord('');
      setCurrentAnim(DEFAULT_SIGN);
      return;
    }

    setIsPlaying(true);
    const word = queue[0];
    
    // Check if we have a direct match
    const animUrl = SIGN_DICTIONARY[word] || DEFAULT_SIGN;
    
    setCurrentWord(word);
    setCurrentAnim(animUrl);

    // Simulate animation playing time (e.g., 2 seconds per word)
    setTimeout(() => {
      setQueue(prev => prev.slice(1));
      setIsPlaying(false);
    }, 2000);
  };

  return (
    <div className="text-to-sign-container">
      <h4>Sign Language Animation</h4>
      <div className="animation-display">
        <img src={currentAnim} alt={`Sign for ${currentWord}`} className="sign-gif" />
      </div>
      <div className="transcript-display">
        <strong>Speaking:</strong> {currentWord || "..."}
      </div>
    </div>
  );
}
