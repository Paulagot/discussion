// useAudio.js
import { useRef, useCallback, useEffect } from 'react';

export function useAudio({ isAdmin, guestName }) {
  const audioRef = useRef(null);
  const hasPlayedSound = useRef(false);
  const isUnlocked = useRef(false); // Track if audio is unlocked

  // Initialize audio
  if (!audioRef.current) {
    audioRef.current = new Audio('/bell.mp3');
    audioRef.current.volume = 0.5;
  }

  // Unlock audio with a silent sound on mount
  useEffect(() => {
    if (!isUnlocked.current) {
      const silentAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='); // Silent WAV
      silentAudio.volume = 0;
      silentAudio.play()
        .then(() => {
          console.log(`Audio unlocked for ${isAdmin ? 'admin' : 'user'} (${guestName})`);
          isUnlocked.current = true;
        })
        .catch((err) => console.error('Failed to unlock audio on mount:', err));
    }
  }, [isAdmin, guestName]);

  const playAudio = useCallback((source) => {
    const role = isAdmin ? 'admin' : 'user';
    // console.log(`playAudio called by ${role} (${guestName}) for ${source}`);
    if (!isUnlocked.current) {
      console.warn(`Audio not unlocked yet for ${role} (${guestName}), attempting to play anyway`);
    }
    audioRef.current.play()
      .then(() => console.log(`Audio played successfully for ${role} (${guestName}) from ${source}`))
      .catch((error) => console.error(`Audio play failed for ${role} (${guestName}) from ${source}:`, error));
  }, [isAdmin, guestName]);

  const resetTimerSound = useCallback(() => {
    hasPlayedSound.current = false;
  }, []);

  return { playAudio, hasPlayedSound, resetTimerSound };
}