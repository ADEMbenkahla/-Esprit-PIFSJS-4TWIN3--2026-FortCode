import { useCallback, useRef, useEffect } from 'react';

export const useSoundEffects = () => {
  // Use a shared AudioContext to avoid creating multiple contexts
  const audioContextRef = useRef(null);

  useEffect(() => {
    // Create AudioContext on mount
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Cleanup on unmount
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const isEnabled = () => {
    return localStorage.getItem('soundEnabled') !== 'false';
  };

  const playSound = useCallback((type) => {
    if (!isEnabled()) return;

    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;

      // Resume context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure sound based on type
      switch (type) {
        case 'click':
          oscillator.frequency.value = 800;
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          break;

        case 'hover':
          oscillator.frequency.value = 600;
          gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.05);
          break;

        case 'success': {
          // Success sound - ascending notes
          const frequencies = [523.25, 659.25, 783.99]; // C, E, G
          frequencies.forEach((freq, index) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, audioContext.currentTime + index * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.2);
            osc.start(audioContext.currentTime + index * 0.1);
            osc.stop(audioContext.currentTime + index * 0.1 + 0.2);
          });
          break;
        }

        case 'error':
          oscillator.frequency.value = 200;
          oscillator.type = 'sawtooth';
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;

        case 'notification':
          oscillator.frequency.value = 1000;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.15);
          break;

        case 'toggle':
          oscillator.frequency.value = 1200;
          oscillator.type = 'square';
          gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.08);
          break;

        case 'select':
          oscillator.frequency.value = 900;
          oscillator.type = 'triangle';
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.12);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.12);
          break;

        default:
          oscillator.frequency.value = 440;
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
      }
    } catch (error) {
      console.error('Sound playback error:', error);
    }
  }, []);

  return {
    playClick: () => playSound('click'),
    playHover: () => playSound('hover'),
    playSuccess: () => playSound('success'),
    playError: () => playSound('error'),
    playNotification: () => playSound('notification'),
    playToggle: () => playSound('toggle'),
    playSelect: () => playSound('select'),
  };
};
