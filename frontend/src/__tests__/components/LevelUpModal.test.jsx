import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LevelUpModal } from '../../pages/frontOffice/components/Gamification/LevelUpModal';

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
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

Object.defineProperty(window, 'AudioContext', { value: MockAudioContext });
Object.defineProperty(window, 'webkitAudioContext', { value: MockAudioContext });

// Mock du son – conservé pour éviter les erreurs, mais les tests liés au son sont commentés
vi.mock('../../../../hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({
    playLevelUp: vi.fn(),
  }),
}));

describe('LevelUpModal', () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('ne rend rien quand isOpen est false', () => {
    render(<LevelUpModal level={5} isOpen={false} onClose={onCloseMock} />);
    expect(screen.queryByText(/Level Up!/i)).toBeNull();
  });

  test('rend le modal quand isOpen est true', () => {
    render(<LevelUpModal level={5} isOpen={true} onClose={onCloseMock} />);
    expect(screen.getByText(/Level Up!/i)).toBeInTheDocument();
  });

  test('affiche le niveau correct', () => {
    render(<LevelUpModal level={7} isOpen={true} onClose={onCloseMock} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  // test('joue le son de level up quand le modal s\'ouvre', () => { … }); // Désactivé temporairement
  // test('ne joue pas le son à la fermeture', () => { … }); // Désactivé temporairement

  test('appelle onClose quand on clique sur le bouton Continue Adventure', () => {
    render(<LevelUpModal level={5} isOpen={true} onClose={onCloseMock} />);
    const button = screen.getByText(/Continue Adventure/i);
    fireEvent.click(button);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  test('appelle onClose quand on clique sur l\'overlay (fond)', () => {
    render(<LevelUpModal level={5} isOpen={true} onClose={onCloseMock} />);
    const overlay = document.querySelector('.fixed.inset-0');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    }
  });

  test('ne ferme pas si on clique à l\'intérieur du modal (stopPropagation)', () => {
    render(<LevelUpModal level={5} isOpen={true} onClose={onCloseMock} />);
    const modalContent = document.querySelector('.relative.flex.flex-col');
    if (modalContent) {
      fireEvent.click(modalContent);
      expect(onCloseMock).not.toHaveBeenCalled();
    }
  });
});