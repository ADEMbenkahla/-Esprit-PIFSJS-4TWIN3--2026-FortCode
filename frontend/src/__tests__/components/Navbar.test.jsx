import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from '../../context/SettingsContext';

// ⚠️ CRITICAL: Les mocks doivent être définis AVANT l'import du composant
// et ne peuvent pas utiliser de variables externes.

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

vi.mock('../../../context/SocketContext', () => ({
  useSocket: () => ({
    disconnect: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({
    playClick: vi.fn(),
    playHover: vi.fn(),
  }),
}));

vi.mock('../../../services/api', () => ({
  requestVirtualRoom: vi.fn().mockResolvedValue({ data: { request: { status: 'pending' } } }),
  getMyVirtualRoomRequest: vi.fn().mockResolvedValue({ data: { request: null } }),
  adminChallengesApi: {
    list: vi.fn().mockResolvedValue({ data: [] })
  }
}));

vi.mock('../components/ProfileModal', () => ({
  ProfileModal: ({ isOpen, onClose }) => isOpen ? <div data-testid="profile-modal">Profile Modal</div> : null,
}));

vi.mock('../components/Gamification/RankBadge', () => ({
  RankBadge: ({ rank }) => <div data-testid="rank-badge">{rank || 'Iron'}</div>,
}));

// Import du composant APRÈS tous les mocks
import { Navbar } from '../../pages/frontOffice/components/layout/Navbar';

// Mock de window.AudioContext (pas de hoisting, peut être défini après)
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

Object.defineProperty(window, 'AudioContext', { value: MockAudioContext });
Object.defineProperty(window, 'webkitAudioContext', { value: MockAudioContext });

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

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper pour créer un token factice
const createMockToken = (role, expHours = 1) => {
  const payload = { 
    role, 
    id: 'user123',
    exp: Math.floor(Date.now() / 1000) + (expHours * 3600) 
  };
  const encodedPayload = btoa(JSON.stringify(payload));
  return `header.${encodedPayload}.signature`;
};

describe('Navbar Component - Tests Complets', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    mockFetch.mockClear();
    global.innerWidth = 1024;
    global.dispatchEvent(new Event('resize'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderNavbar = () => {
    return render(
      <BrowserRouter>
        <SettingsProvider>
          <Navbar />
        </SettingsProvider>
      </BrowserRouter>
    );
  };

  // ==================== TESTS DE RENDU ====================

  test('1. le composant se render sans erreur', () => {
    renderNavbar();
    expect(document.querySelector('nav')).toBeDefined();
  });

  test('2. affiche le logo FORTCODE (séparé en deux parties)', () => {
    renderNavbar();
    const fortPart = screen.getByText(/FORT/i);
    const codeParts = screen.getAllByText(/CODE/i);
    
    expect(fortPart).toBeDefined();
    expect(codeParts.length).toBeGreaterThan(0);
  });

  test('3. affiche les liens de navigation principaux', () => {
    renderNavbar();
    expect(screen.getByText(/Map/i)).toBeDefined();
    expect(screen.getByText(/Training/i)).toBeDefined();
    expect(screen.getByText(/Arena/i)).toBeDefined();
  });

  test('4. affiche le sous-titre "Code Apprentice"', () => {
    renderNavbar();
    expect(screen.getByText(/Code Apprentice/i)).toBeDefined();
  });

  test('5. affiche le bouton Login quand non connecté', () => {
    renderNavbar();
    expect(screen.getByText(/Login/i)).toBeDefined();
  });

  test('6. n\'affiche pas le bouton Reset Progress quand non connecté', () => {
    renderNavbar();
    expect(screen.queryByText(/Reset Progress/i)).toBeNull();
  });

  test('7. n\'affiche pas le bouton Enter Castle quand non connecté', () => {
    renderNavbar();
    expect(screen.queryByText(/Enter Castle/i)).toBeNull();
  });

  // ==================== TESTS UTILISATEUR CONNECTÉ ====================

  test('8. affiche les éléments utilisateur quand connecté', async () => {
    const token = createMockToken('participant');
    mockSessionStorage.setItem('token', token);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        user: { 
          role: 'participant', 
          gamification: { rank: 'Iron', level: 1, points: 500 },
          email: 'test@test.com',
          username: 'testuser',
          avatar: 'https://example.com/avatar.jpg'
        } 
      }),
    });

    renderNavbar();
    
    await waitFor(() => {
      expect(screen.getByText(/Reset Progress/i)).toBeDefined();
      expect(screen.getByText(/Enter Castle/i)).toBeDefined();
    });
  });

  test('9. le bouton Reset Progress appelle Swal.confirm', async () => {
    const token = createMockToken('participant');
    mockSessionStorage.setItem('token', token);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        user: { role: 'participant', gamification: { rank: 'Iron', level: 1 }, email: 'test@test.com' } 
      }),
    });

    renderNavbar();
    
    await waitFor(() => {
      expect(screen.getByText(/Reset Progress/i)).toBeDefined();
    });
    
    const resetButton = screen.getByText(/Reset Progress/i);
    fireEvent.click(resetButton);
    
    // Récupérer le mock directement depuis le module
    const Swal = await import('sweetalert2');
    expect(Swal.default.fire).toHaveBeenCalled();
  });

  // ==================== TESTS MENU MOBILE ====================

  test('10. affiche le bouton du menu mobile sur les petits écrans', () => {
    global.innerWidth = 500;
    global.dispatchEvent(new Event('resize'));
    
    renderNavbar();
    
    const menuButton = screen.getByLabelText(/Toggle navigation menu/i);
    expect(menuButton).toBeDefined();
  });

  test('11. le menu mobile s\'ouvre et se ferme', async () => {
    global.innerWidth = 500;
    global.dispatchEvent(new Event('resize'));
    
    renderNavbar();
    
    const menuButton = screen.getByLabelText(/Toggle navigation menu/i);
    fireEvent.click(menuButton);
    
    await waitFor(() => {
      const trainingLinks = screen.getAllByText(/Training/i);
      expect(trainingLinks.length).toBeGreaterThan(0);
    });
  });

  // ==================== TESTS DE REDIRECTION ====================

  test('12. le lien Map redirige vers /map', () => {
    renderNavbar();
    const mapLink = screen.getByText(/Map/i);
    expect(mapLink.closest('a')).toHaveAttribute('href', '/map');
  });

  test('13. le lien Training redirige vers /training', () => {
    renderNavbar();
    const trainingLink = screen.getByText(/Training/i);
    expect(trainingLink.closest('a')).toHaveAttribute('href', '/training');
  });

  test('14. le lien Arena redirige vers /arena', () => {
    renderNavbar();
    const arenaLink = screen.getByText(/Arena/i);
    expect(arenaLink.closest('a')).toHaveAttribute('href', '/arena');
  });

  test('15. le lien Login redirige vers /', () => {
    renderNavbar();
    const loginLink = screen.getByText(/Login/i);
    expect(loginLink.closest('a')).toHaveAttribute('href', '/');
  });

  // ==================== TESTS D'ERREUR ====================

  test('16. gère l\'erreur lors du chargement du profil', async () => {
    const token = createMockToken('participant');
    mockSessionStorage.setItem('token', token);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderNavbar();
    
    await waitFor(() => {
      expect(document.querySelector('nav')).toBeDefined();
    });
  });
});