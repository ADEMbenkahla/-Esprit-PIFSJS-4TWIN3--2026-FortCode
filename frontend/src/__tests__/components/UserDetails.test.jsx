import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import UserDetails from '../../pages/backOffice/components/UserDetails';

// Mock des modules
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock des storages
const createStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
};

const mockSessionStorage = createStorageMock();
const mockLocalStorage = createStorageMock();

Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

global.fetch = vi.fn();
window.alert = vi.fn();

describe('UserDetails Component', () => {
  const mockUser = {
    _id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'participant',
    avatar: 'https://example.com/avatar.jpg',
    isActive: true,
    flags: ['Suspicious activity detected'],
    languages: ['JavaScript', 'Python', 'React'],
    reports: 2,
    submissions: 15,
    gamification: {
      rank: 'Silver',
      level: 5,
      points: 1250,
    },
  };

  const mockUserInactive = {
    ...mockUser,
    _id: 'user456',
    username: 'inactiveuser',
    isActive: false,
    flags: [],
    languages: [],
    reports: 0,
    gamification: {
      rank: 'Iron',
      level: 1,
      points: 0,
    },
  };

  const mockOnClose = vi.fn();
  const mockOnUserUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    mockNavigate.mockClear();
    global.fetch.mockReset();
    window.alert.mockClear();
  });

  const renderComponent = (user = mockUser, props = {}) => {
    return render(
      <BrowserRouter>
        <UserDetails
          user={user}
          onClose={mockOnClose}
          onUserUpdated={mockOnUserUpdated}
          {...props}
        />
      </BrowserRouter>
    );
  };

  // ==================== TESTS DE RENDU ====================

  test('1. affiche les informations de base de l\'utilisateur', () => {
    renderComponent();
    expect(screen.getByText('User Details')).toBeInTheDocument();
    expect(screen.getByText(mockUser.username)).toBeInTheDocument();
    expect(screen.getByText(`@${mockUser.username} • ${mockUser.role}`)).toBeInTheDocument();
  });

  test('2. affiche l\'avatar avec la bonne source', () => {
    renderComponent();
    const avatar = screen.getByAltText(mockUser.username);
    expect(avatar).toHaveAttribute('src', mockUser.avatar);
  });

  test('3. affiche l\'avatar par défaut quand aucun avatar n\'est fourni', () => {
    const userWithoutAvatar = { ...mockUser, avatar: '' };
    renderComponent(userWithoutAvatar);
    const avatar = screen.getByAltText(mockUser.username);
    expect(avatar).toHaveAttribute('src', expect.stringContaining('pravatar.cc'));
  });

  test('4. affiche le bon statut (actif)', () => {
    renderComponent();
    const statusIndicator = document.querySelector('.bg-green-500');
    expect(statusIndicator).toBeInTheDocument();
  });

  test('5. affiche le bon statut (inactif)', () => {
    renderComponent(mockUserInactive);
    const statusIndicator = document.querySelector('.bg-red-500');
    expect(statusIndicator).toBeInTheDocument();
  });

  test('6. affiche les statistiques de gamification', () => {
    renderComponent();
    expect(screen.getByText(/Silver/i)).toBeInTheDocument();
    expect(screen.getByText(/Lvl 5 \(1250 XP\)/i)).toBeInTheDocument();
  });

  test('7. affiche les valeurs par défaut quand la gamification est manquante', () => {
    const userWithoutGamification = { ...mockUser, gamification: undefined };
    renderComponent(userWithoutGamification);
    expect(screen.getByText(/Iron/i)).toBeInTheDocument();
    expect(screen.getByText(/Lvl 1 \(0 XP\)/i)).toBeInTheDocument();
  });

  test('8. affiche les langues de l\'utilisateur', () => {
    renderComponent();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  test('9. affiche "—" quand aucune langue n\'est fournie', () => {
    renderComponent(mockUserInactive);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('10. affiche le nombre de signalements', () => {
    renderComponent();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('11. affiche les flags système quand présents', () => {
    renderComponent();
    expect(screen.getByText('Account Flags')).toBeInTheDocument();
    expect(screen.getByText(/Suspicious activity detected/i)).toBeInTheDocument();
  });

  test('12. n\'affiche pas les flags quand il n\'y en a pas', () => {
    renderComponent(mockUserInactive);
    expect(screen.queryByText('Account Flags')).not.toBeInTheDocument();
  });

  test('13. affiche le bouton "Suspend" quand l\'utilisateur est actif', () => {
    renderComponent();
    const suspendButton = screen.getByText('Suspend');
    expect(suspendButton).toBeInTheDocument();
    expect(suspendButton).toHaveClass('border-red-500/50');
  });

  test('14. affiche le bouton "Activate" quand l\'utilisateur est inactif', () => {
    renderComponent(mockUserInactive);
    const activateButton = screen.getByText('Activate');
    expect(activateButton).toBeInTheDocument();
    expect(activateButton).toHaveClass('border-green-500/50');
  });

  // ==================== TESTS D'INTERACTION ====================

  test('15. appelle onClose quand on clique sur le bouton fermer', () => {
    renderComponent();
    const closeButton = screen.getByLabelText('Close user details');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('16. appelle onUserUpdated après avoir changé le statut avec succès', async () => {
    mockSessionStorage.setItem('token', 'fake-token');
    global.fetch.mockResolvedValueOnce({
      ok: true,
    });

    renderComponent();
    const toggleButton = screen.getByText('Suspend');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/admin/users/user123/toggle',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            Authorization: 'Bearer fake-token',
          }),
        })
      );
      expect(mockOnUserUpdated).toHaveBeenCalledTimes(1);
    });
  });

  test('17. affiche une erreur quand la requête de changement de statut échoue', async () => {
    mockSessionStorage.setItem('token', 'fake-token');
    global.fetch.mockResolvedValueOnce({
      ok: false,
    });

    renderComponent();
    const toggleButton = screen.getByText('Suspend');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to update user status');
    });
  });

  test('18. redirige vers la page d\'activité quand on clique sur "View Activity Logs"', () => {
    renderComponent();
    const logsButton = screen.getByText('View Activity Logs');
    fireEvent.click(logsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/activity?userId=user123');
  });

  // ==================== TEST D'INTÉGRATION ====================

  test('19. utilise le token du localStorage si sessionStorage est vide', async () => {
    mockLocalStorage.setItem('token', 'local-token');
    global.fetch.mockResolvedValueOnce({
      ok: true,
    });

    renderComponent();
    const toggleButton = screen.getByText('Suspend');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer local-token',
          }),
        })
      );
    });
  });
});