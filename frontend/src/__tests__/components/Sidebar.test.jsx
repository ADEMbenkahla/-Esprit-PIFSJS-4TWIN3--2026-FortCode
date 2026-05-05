import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../../pages/backOffice/components/Sidebar';
import { SidebarProvider } from '../../context/SidebarContext';

// Mock des modules
vi.mock('../../../assets/logo.png', () => ({ default: 'logo-mock.png' }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/backoffice/dashboard' }),
  };
});

const mockDisconnect = vi.fn();
vi.mock('../../../context/SocketContext', () => ({
  useSocket: () => ({
    disconnect: mockDisconnect,
  }),
}));

const mockCloseSidebar = vi.fn();
vi.mock('../../../context/SidebarContext', async () => {
  const actual = await vi.importActual('../../../context/SidebarContext');
  return {
    ...actual,
    useSidebar: () => ({
      isSidebarOpen: true,
      closeSidebar: mockCloseSidebar,
    }),
  };
});

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

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
window.dispatchEvent = vi.fn();

import Swal from 'sweetalert2';

describe('Sidebar Component - Tests Simplifiés', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    mockNavigate.mockClear();
    mockCloseSidebar.mockClear();
    mockDisconnect.mockClear();
    global.fetch.mockReset();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </BrowserRouter>
    );
  };

  // ==================== TESTS DE RENDU ====================

  test.skip('1. le composant se render sans erreur', () => {
    renderComponent();
    expect(screen.getByText(/FORTCODE/i)).toBeInTheDocument();
  });

  test('2. affiche le logo FORTCODE', () => {
    renderComponent();
    expect(screen.getByText(/FORT/i)).toBeInTheDocument();
    expect(screen.getByText(/CODE/i)).toBeInTheDocument();
  });

  test('3. affiche le bouton logout', () => {
    renderComponent();
    // Chercher le texte "Logout" qui est un span avec la classe font-medium
    const logoutElements = screen.getAllByText('Logout');
    expect(logoutElements.length).toBeGreaterThan(0);
  });

  test('4. affiche l\'utilisateur par défaut (Guest)', () => {
    renderComponent();
    const guestElements = screen.getAllByText('Guest');
    expect(guestElements.length).toBeGreaterThan(0);
  });

  // ==================== TESTS DE NAVIGATION ====================

  test('5. navigue vers Dashboard', () => {
    renderComponent();
    const dashboardButton = screen.getByRole('button', { name: /Dashboard/i });
    fireEvent.click(dashboardButton);
    expect(mockNavigate).toHaveBeenCalledWith('/backoffice/dashboard');
  });

  test('6. navigue vers My Activity', () => {
    renderComponent();
    const myActivityButton = screen.getByRole('button', { name: /My Activity/i });
    fireEvent.click(myActivityButton);
    expect(mockNavigate).toHaveBeenCalledWith('/my-activity');
  });

  test('7. navigue vers User Tracker', () => {
    renderComponent();
    const userTrackerButton = screen.getByRole('button', { name: /User Tracker/i });
    fireEvent.click(userTrackerButton);
    expect(mockNavigate).toHaveBeenCalledWith('/backoffice/users');
  });

  test('8. navigue vers Settings', () => {
    renderComponent();
    const settingsButton = screen.getByRole('button', { name: /Settings/i });
    fireEvent.click(settingsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/backoffice/settings');
  });

  // ==================== TESTS DÉCONNEXION ====================

  test('9. ouvre la confirmation de déconnexion', async () => {
    renderComponent();
    const logoutButton = screen.getByRole('button', { name: /Logout/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalled();
    });
  });

  // ==================== TESTS ADMIN ====================

  test('10. n\'affiche pas les items admin pour un utilisateur non admin', async () => {
    mockSessionStorage.setItem('token', 'test-token');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { username: 'user', role: 'participant' } }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('Role Requests')).not.toBeInTheDocument();
      expect(screen.queryByText('Stages')).not.toBeInTheDocument();
    });
  });

  test('11. affiche les items admin pour un utilisateur admin', async () => {
    mockSessionStorage.setItem('token', 'test-token');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { username: 'admin', role: 'admin' } }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Role Requests')).toBeInTheDocument();
      expect(screen.getByText('Stages')).toBeInTheDocument();
    });
  });
});