import React, { useState, useEffect, useRef } from 'react';
import './TextToSignAnim.css';

// Extended dictionary mapping words to sign language GIF URLs
const SIGN_DICTIONARY = {
  "hello": "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif",
  "goodbye": "https://media.giphy.com/media/l0ExdMV6mjS3T0jLi/giphy.gif",
  "yes": "https://media.giphy.com/media/26AHteTfafcdKC6ys/giphy.gif",
  "no": "https://media.giphy.com/media/3o7TKwmnVcWcgKbCh2/giphy.gif",
  "thank you": "https://media.giphy.com/media/l41lO5sLpswR3g3wA/giphy.gif",
  "please": "https://media.giphy.com/media/26FPC30PewHkE6X2o/giphy.gif",
  "sorry": "https://media.giphy.com/media/3o7TKnHQz9alipbY5i/giphy.gif",
  "good": "https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif",
  "morning": "https://media.giphy.com/media/3o7TKxOzWkgxIIMvwQ/giphy.gif",
  "help": "https://media.giphy.com/media/3o7TKM411zO7G1n160/giphy.gif",
  "love": "https://media.giphy.com/media/3o7TKn7k1oN41TjMje/giphy.gif",
  "friend": "https://media.giphy.com/media/3o7TKoV5T6t6PQQyeA/giphy.gif",
  "family": "https://media.giphy.com/media/3o7TKpxO2WkgxIIMvwQ/giphy.gif",
  "ok": "https://media.giphy.com/media/3o7TKnD5T6tLdYfL3y/giphy.gif",
  "happy": "https://media.giphy.com/media/3o7TKoT7l0U1oOwyA0/giphy.gif",
  "sad": "https://media.giphy.com/media/3o7TKpxg6e191o652w/giphy.gif",
  "sleep": "https://media.giphy.com/media/3o7TKwzGdyv90mS7OE/giphy.gif",
  "home": "https://media.giphy.com/media/3o7TKnS8LvywK1Q6u4/giphy.gif",
  "work": "https://media.giphy.com/media/26AHuScdR5nK4r54c/giphy.gif",
  "water": "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif",
  "food": "https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif"
};

const DEFAULT_SIGN = "https://media.giphy.com/media/3o7TKUM3IgHTX2WINy/giphy.gif"; // Thinking/waiting sign

export default function TextToSignAnim({ transcript }) {
  const [currentWord, setCurrentWord] = useState('');
  const [currentAnim, setCurrentAnim] = useState(DEFAULT_SIGN);
  const [queue, setQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpelling, setIsSpelling] = useState(false);
  const lastProcessedTranscript = useRef('');

  // Parse new transcript into words and letter sequences
  useEffect(() => {
    if (transcript && transcript !== lastProcessedTranscript.current) {
      lastProcessedTranscript.current = transcript;
      const cleanedText = transcript.replace(/[.,!?]/g, '').trim();
      
      if (cleanedText) {
        const words = cleanedText.toLowerCase().split(/\s+/);
        const newQueueItems = [];
        
        words.forEach(word => {
          if (SIGN_DICTIONARY[word]) {
            // Push direct dictionary match
            newQueueItems.push({
              type: 'word',
              value: word,
              url: SIGN_DICTIONARY[word]
            });
          } else {
            // Push fingerspelling sequence for unknown word
            const letters = [...word];
            letters.forEach((char) => {
              if (/^[a-z]$/.test(char)) {
                newQueueItems.push({
                  type: 'letter',
                  value: char,
                  parentWord: word
                });
              }
            });
            // Small pause after spelling the word
            newQueueItems.push({
              type: 'pause',
              value: ' '
            });
          }
        });
        
        setQueue(prev => [...prev, ...newQueueItems]);
      }
    }
  }, [transcript]);

  // Process queue items sequentially
  useEffect(() => {
    if (queue.length > 0 && !isPlaying) {
      playNext();
    }
  }, [queue, isPlaying]);

  const playNext = () => {
    if (queue.length === 0) {
      setIsPlaying(false);
      setIsSpelling(false);
      setCurrentWord('');
      setCurrentAnim(DEFAULT_SIGN);
      return;
    }

    setIsPlaying(true);
    const item = queue[0];

    if (item.type === 'word') {
      setIsSpelling(false);
      setCurrentWord(item.value);
      setCurrentAnim(item.url);
      
      // Standard word animation lasts 2 seconds
      setTimeout(() => {
        setQueue(prev => prev.slice(1));
        setIsPlaying(false);
      }, 2000);
      
    } else if (item.type === 'letter') {
      setIsSpelling(true);
      setCurrentWord(item.value);
      setCurrentAnim(DEFAULT_SIGN); // Keep standard wait sign in background
      
      // Fingerspelled letters are quick (800ms)
      setTimeout(() => {
        setQueue(prev => prev.slice(1));
        setIsPlaying(false);
      }, 800);
      
    } else if (item.type === 'pause') {
      setIsSpelling(false);
      setCurrentWord(' ');
      setCurrentAnim(DEFAULT_SIGN);
      
      // Brief pause between words (400ms)
      setTimeout(() => {
        setQueue(prev => prev.slice(1));
        setIsPlaying(false);
      }, 400);
    }
  };

  return (
    <div className="text-to-sign-container">
      <h4>Sign Language Translation</h4>
      <div className="animation-display">
        <img src={currentAnim} alt="Sign Language Avatar" className="sign-gif" />
        
        {/* Fingerspelling HUD Overlay */}
        {isSpelling && (
          <div className="spelling-overlay glass-overlay">
            <span className="spelling-letter">{currentWord.toUpperCase()}</span>
            <span className="spelling-label">SPELLING</span>
          </div>
        )}
      </div>
      <div className="transcript-display">
        <strong>Avatar Playing:</strong>{' '}
        {isSpelling ? (
          <span className="spelling-text-highlight">Spelling: {currentWord.toUpperCase()}</span>
        ) : (
          <span>{currentWord || '...'}</span>
        )}
      </div>
    </div>
  );
}
