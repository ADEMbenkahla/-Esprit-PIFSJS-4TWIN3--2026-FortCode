import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccessibilityMenu from '../../components/AccessibilityMenu';

// Mock du contexte SettingsContext
const mockUpdateFontSize = vi.fn();
const mockUpdateHighContrast = vi.fn();
const mockUpdateReadingGuide = vi.fn();
const mockUpdateReadOnHover = vi.fn();
const mockUpdateMonochrome = vi.fn();

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    fontSize: 'medium',
    updateFontSize: mockUpdateFontSize,
    highContrast: false,
    updateHighContrast: mockUpdateHighContrast,
    readingGuide: false,
    updateReadingGuide: mockUpdateReadingGuide,
    readOnHover: false,
    updateReadOnHover: mockUpdateReadOnHover,
    monochrome: false,
    updateMonochrome: mockUpdateMonochrome,
  }),
}));

// Mock de localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock de window.speechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    getVoices: vi.fn(() => []),
    speak: vi.fn(),
    cancel: vi.fn(),
    onvoiceschanged: null,
  },
  writable: true,
});

describe('AccessibilityMenu Component', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  test('renders the accessibility button', () => {
    render(<AccessibilityMenu />);
    const button = screen.getAllByRole('button')[0];
    expect(button).toBeDefined();
  });

  test('opens menu when button is clicked', () => {
    render(<AccessibilityMenu />);
    const toggleButton = screen.getAllByRole('button')[0];
    fireEvent.click(toggleButton);
    
    expect(screen.getByText(/Text Size/i)).toBeDefined();
    expect(screen.getByText(/Reading Guide/i)).toBeDefined();
  });

  test('cycles font size when text size button is clicked', () => {
    render(<AccessibilityMenu />);
    const toggleButton = screen.getAllByRole('button')[0];
    fireEvent.click(toggleButton);
    
    // Trouver le bouton par son titre
    const textSizeButton = screen.getByTitle(/Text Size/i);
    fireEvent.click(textSizeButton);
    expect(mockUpdateFontSize).toHaveBeenCalled();
  });

  test('toggles reading guide when button is clicked', () => {
    render(<AccessibilityMenu />);
    const toggleButton = screen.getAllByRole('button')[0];
    fireEvent.click(toggleButton);
    
    const readingGuideButton = screen.getByTitle(/Reading Guide/i);
    fireEvent.click(readingGuideButton);
    expect(mockUpdateReadingGuide).toHaveBeenCalledWith(true);
  });

  test('toggles high contrast when button is clicked', () => {
    render(<AccessibilityMenu />);
    const toggleButton = screen.getAllByRole('button')[0];
    fireEvent.click(toggleButton);
    
    const highContrastButton = screen.getByTitle(/High Contrast/i);
    fireEvent.click(highContrastButton);
    expect(mockUpdateHighContrast).toHaveBeenCalledWith(true);
  });

  test('toggles audio description when button is clicked', () => {
    render(<AccessibilityMenu />);
    const toggleButton = screen.getAllByRole('button')[0];
    fireEvent.click(toggleButton);
    
    const audioButton = screen.getByTitle(/Audio Description/i);
    fireEvent.click(audioButton);
    expect(mockUpdateReadOnHover).toHaveBeenCalledWith(true);
  });

});