import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsProvider, useSettings } from '../../context/SettingsContext';

// Mock de fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock des storages
const mockSessionStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Helper pour créer un token JWT factice
const createMockToken = (role = 'participant') => {
  const payload = { role, exp: Date.now() / 1000 + 3600, username: 'testuser' };
  const encodedPayload = btoa(JSON.stringify(payload));
  return `header.${encodedPayload}.signature`;
};

// Composant de test pour utiliser le contexte
const TestComponent = () => {
  const {
    theme,
    accentColor,
    fontSize,
    updateTheme,
    updateAccentColor,
    updateFontSize,
    avatar,
    username,
    isLoaded,
  } = useSettings();

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="accentColor">{accentColor}</div>
      <div data-testid="fontSize">{fontSize}</div>
      <div data-testid="avatar">{avatar}</div>
      <div data-testid="username">{username}</div>
      <div data-testid="isLoaded">{isLoaded ? 'loaded' : 'loading'}</div>
      <button onClick={() => updateTheme('light')}>Set Light</button>
      <button onClick={() => updateAccentColor('purple')}>Set Purple</button>
      <button onClick={() => updateFontSize('large')}>Set Large Font</button>
    </div>
  );
};

describe('SettingsContext', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    mockFetch.mockClear();
  });

  test('fournit les valeurs par défaut quand non connecté', async () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('isLoaded').textContent).toBe('loaded');
    });
    
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('accentColor').textContent).toBe('blue');
    expect(screen.getByTestId('fontSize').textContent).toBe('medium');
    expect(screen.getByTestId('avatar').textContent).toContain('dicebear');
  });

  test('charge les paramètres utilisateur quand connecté', async () => {
    const token = createMockToken();
    mockSessionStorage.setItem('token', token);
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          settings: {
            theme: 'light',
            accentColor: 'purple',
            fontSize: 'large',
            fontFamily: 'outfit',
            highContrast: true,
          },
          avatar: 'custom-avatar-url',
          username: 'customuser',
        },
      }),
    });
    
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('isLoaded').textContent).toBe('loaded');
      expect(screen.getByTestId('theme').textContent).toBe('light');
      expect(screen.getByTestId('accentColor').textContent).toBe('purple');
      expect(screen.getByTestId('fontSize').textContent).toBe('large');
      expect(screen.getByTestId('avatar').textContent).toBe('custom-avatar-url');
      expect(screen.getByTestId('username').textContent).toBe('customuser');
    });
  });

  test('les fonctions de mise à jour modifient l\'état', async () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('isLoaded').textContent).toBe('loaded');
    });
    
    // Tester updateTheme
    const setLightButton = screen.getByText('Set Light');
    userEvent.click(setLightButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('light');
    });
    
    // Tester updateAccentColor
    const setPurpleButton = screen.getByText('Set Purple');
    userEvent.click(setPurpleButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('accentColor').textContent).toBe('purple');
    });
    
    // Tester updateFontSize
    const setLargeFontButton = screen.getByText('Set Large Font');
    userEvent.click(setLargeFontButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('fontSize').textContent).toBe('large');
    });
  });

  test('le hook useSettings lève une erreur en dehors du provider', () => {
    const BadComponent = () => {
      useSettings();
      return null;
    };
    
    expect(() => render(<BadComponent />)).toThrow('useSettings must be used within a SettingsProvider');
  });

});