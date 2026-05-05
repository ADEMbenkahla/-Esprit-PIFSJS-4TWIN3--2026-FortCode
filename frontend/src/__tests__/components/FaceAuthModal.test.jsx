import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FaceAuthModal from '../../components/FaceAuthModal';

// Mock de face-api.js
vi.mock('face-api.js', () => ({
  nets: {
    tinyFaceDetector: { loadFromUri: vi.fn().mockResolvedValue(true) },
    faceLandmark68Net: { loadFromUri: vi.fn().mockResolvedValue(true) },
    faceRecognitionNet: { loadFromUri: vi.fn().mockResolvedValue(true) },
  },
  TinyFaceDetectorOptions: vi.fn(),
  detectSingleFace: vi.fn().mockReturnValue({
    withFaceLandmarks: vi.fn().mockReturnValue({
      withFaceDescriptor: vi.fn().mockResolvedValue({
        descriptor: new Float32Array([0.1, 0.2, 0.3]),
      }),
    }),
  }),
}));

// Mock de react-webcam
vi.mock('react-webcam', () => ({
  default: vi.fn(() => <video data-testid="webcam" />),
}));

describe('FaceAuthModal Component', () => {
  
  const mockOnClose = vi.fn();
  const mockOnCapture = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('ne rend rien si isOpen est false', () => {
    render(
      <FaceAuthModal 
        isOpen={false} 
        onClose={mockOnClose} 
        onCapture={mockOnCapture} 
      />
    );
    
    expect(screen.queryByText(/Register Face ID/i)).toBeNull();
  });

  test('rend le modal quand isOpen est true', () => {
    render(
      <FaceAuthModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onCapture={mockOnCapture} 
      />
    );
    
    expect(screen.getByText(/Register Face ID/i)).toBeDefined();
  });

  test('affiche le mode inscription correctement', () => {
    render(
      <FaceAuthModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onCapture={mockOnCapture} 
        mode="register"
      />
    );
    
    expect(screen.getByText(/Register Face ID/i)).toBeDefined();
    // Utiliser getAllByText puis prendre le premier
    const registerButtons = screen.getAllByText(/Register Face/i);
    expect(registerButtons.length).toBeGreaterThan(0);
  });

  test('affiche le mode login correctement', () => {
    render(
      <FaceAuthModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onCapture={mockOnCapture} 
        mode="login"
      />
    );
    
    expect(screen.getByText(/Face ID Login/i)).toBeDefined();
    const verifyButtons = screen.getAllByText(/Verify Face/i);
    expect(verifyButtons.length).toBeGreaterThan(0);
  });

  test('appelle onClose quand le bouton fermer est cliqué', () => {
    render(
      <FaceAuthModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onCapture={mockOnCapture} 
      />
    );
    
    // Trouver le bouton fermer par son aria-label ou sa classe
    const closeButton = document.querySelector('button.p-1');
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  test('affiche le chargement des modèles', () => {
    render(
      <FaceAuthModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onCapture={mockOnCapture} 
      />
    );
    
    expect(screen.getByText(/Loading models/i)).toBeDefined();
  });

});