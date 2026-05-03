import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UnityCastle } from '../../pages/frontOffice/components/unity/UnityCastle';

// Mock de react-unity-webgl
const mockSendMessage = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

vi.mock('react-unity-webgl', () => ({
  Unity: ({ unityProvider, style }) => <div data-testid="unity-canvas" style={style}>Unity Canvas</div>,
  useUnityContext: () => ({
    unityProvider: {},
    sendMessage: mockSendMessage,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    loadingProgression: 0.5,
  }),
}));

describe('UnityCastle Component', () => {
  const mockOnLayerClick = vi.fn();
  const mockUserProgress = {
    level: 5,
    completedStages: ['stage1', 'stage2'],
    rank: 'Gold',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('affiche l\'écran de chargement initialement', () => {
    render(<UnityCastle userProgress={mockUserProgress} onLayerClick={mockOnLayerClick} />);
    expect(screen.getByText(/Loading FortCode Castle/i)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  
});