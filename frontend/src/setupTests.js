import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock de window.speechSynthesis pour les tests
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    getVoices: vi.fn(() => []),
    speak: vi.fn(),
    cancel: vi.fn(),
  },
  writable: true,
});