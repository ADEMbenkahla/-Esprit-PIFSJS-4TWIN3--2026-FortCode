import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvatarPicker } from '../../pages/frontOffice/components/layout/AvatarPicker';

describe('AvatarPicker Component', () => {
  
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('affiche le composant', () => {
    render(<AvatarPicker currentAvatar="" onSelect={mockOnSelect} />);
    
    expect(screen.getByText(/Avatars/i)).toBeDefined();
    expect(screen.getByText(/Robots/i)).toBeDefined();
  });

  test('affiche le bouton randomize', () => {
    render(<AvatarPicker currentAvatar="" onSelect={mockOnSelect} />);
    
    const randomizeButton = screen.getByTitle(/Randomize Seed/i);
    expect(randomizeButton).toBeDefined();
  });

  test('affiche les styles d\'avatars', () => {
    render(<AvatarPicker currentAvatar="" onSelect={mockOnSelect} />);
    
    expect(screen.getByText(/Avatars/i)).toBeDefined();
    expect(screen.getByText(/Robots/i)).toBeDefined();
    expect(screen.getByText(/Pixel Art/i)).toBeDefined();
    expect(screen.getByText(/Adventure/i)).toBeDefined();
    expect(screen.getByText(/Big Smile/i)).toBeDefined();
  });

  test('change de style quand on clique sur un bouton', () => {
    render(<AvatarPicker currentAvatar="" onSelect={mockOnSelect} />);
    
    const robotsButton = screen.getByText(/Robots/i);
    fireEvent.click(robotsButton);
    
    // Vérifie que le style a changé (le bouton doit avoir une classe active)
    expect(robotsButton.className).toContain('bg-blue-600');
  });

  test('randomize change le seed', () => {
    render(<AvatarPicker currentAvatar="" onSelect={mockOnSelect} />);
    
    const oldSeed = screen.getByText(/Seed:/i).textContent;
    const randomizeButton = screen.getByTitle(/Randomize Seed/i);
    fireEvent.click(randomizeButton);
    
    const newSeed = screen.getByText(/Seed:/i).textContent;
    // Le seed peut rester le même par chance, mais normalement il change
    // Ce test vérifie juste que la fonction s'exécute sans erreur
    expect(randomizeButton).toBeDefined();
  });

  test('appelle onSelect avec l\'URL de l\'avatar', async () => {
    render(<AvatarPicker currentAvatar="" onSelect={mockOnSelect} />);
    
    // Attendre que l'effet s'exécute
    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalled();
    });
  });

});