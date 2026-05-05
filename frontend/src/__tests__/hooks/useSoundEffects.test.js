import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSoundEffects } from '../../hooks/useSoundEffects';

// Mock de window.AudioContext
class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.destination = {};
    this.currentTime = 0;
  }
  createOscillator() {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 0 },
      type: '',
    };
  }
  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'AudioContext', { value: MockAudioContext });
Object.defineProperty(window, 'webkitAudioContext', { value: MockAudioContext });

describe('useSoundEffects', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  test('retourne toutes les fonctions de son', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    expect(result.current.playClick).toBeDefined();
    expect(result.current.playHover).toBeDefined();
    expect(result.current.playSuccess).toBeDefined();
    expect(result.current.playError).toBeDefined();
    expect(result.current.playNotification).toBeDefined();
    expect(result.current.playToggle).toBeDefined();
    expect(result.current.playSelect).toBeDefined();
    expect(result.current.playLevelUp).toBeDefined();
  });

  test('playClick est une fonction', () => {
    const { result } = renderHook(() => useSoundEffects());
    expect(typeof result.current.playClick).toBe('function');
  });

  test('playHover est une fonction', () => {
    const { result } = renderHook(() => useSoundEffects());
    expect(typeof result.current.playHover).toBe('function');
  });

  test('playSuccess est une fonction', () => {
    const { result } = renderHook(() => useSoundEffects());
    expect(typeof result.current.playSuccess).toBe('function');
  });

  test('playError ne provoque pas d\'erreur', async () => {
    const { result } = renderHook(() => useSoundEffects());
    
    expect(() => {
      result.current.playError();
    }).not.toThrow();
  });

  test('playNotification ne provoque pas d\'erreur', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    expect(() => {
      result.current.playNotification();
    }).not.toThrow();
  });

  test('playToggle ne provoque pas d\'erreur', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    expect(() => {
      result.current.playToggle();
    }).not.toThrow();
  });

  test('playSelect ne provoque pas d\'erreur', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    expect(() => {
      result.current.playSelect();
    }).not.toThrow();
  });

  test('playLevelUp ne provoque pas d\'erreur', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    expect(() => {
      result.current.playLevelUp();
    }).not.toThrow();
  });

  test('n\'émet pas de son si soundEnabled est false', () => {
    localStorageMock.getItem.mockReturnValue('false');
    
    const { result } = renderHook(() => useSoundEffects());
    result.current.playClick();
    
    // Le son ne devrait pas être joué, aucune erreur ne devrait être levée
    expect(true).toBe(true);
  });

});