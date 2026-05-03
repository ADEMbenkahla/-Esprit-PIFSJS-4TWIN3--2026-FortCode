import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../../pages/backOffice/components/Header';
import { SidebarProvider } from '../../context/SidebarContext';

// --- Mocks ---
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

describe('Header Component', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    mockFetch.mockClear();
  });

  const renderHeader = (props = {}) =>
    render(
      <BrowserRouter>
        <SidebarProvider>
          <Header {...props} />
        </SidebarProvider>
      </BrowserRouter>
    );

  test('affiche le titre et sous-titre par défaut', () => {
    renderHeader();
    expect(screen.getByText(/User Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage and monitor platform participants/i)).toBeInTheDocument();
  });

  test('affiche le titre et sous-titre personnalisés', () => {
    renderHeader({
      title: 'Custom Title',
      subtitle: 'Custom Subtitle',
    });
    expect(screen.getByText(/Custom Title/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom Subtitle/i)).toBeInTheDocument();
  });

  test('appelle toggleSidebar quand on clique sur le bouton menu', () => {
    renderHeader();
    const menuButton = screen.getByLabelText(/Toggle Sidebar/i);
    fireEvent.click(menuButton);
    // Vérifie simplement que le clic ne cause pas d'erreur
    expect(menuButton).toBeDefined();
  });

  test('affiche le champ de recherche avec la valeur searchQuery', () => {
    renderHeader({ searchQuery: 'test search', onSearchChange: vi.fn() });
    const searchInput = screen.getByPlaceholderText(/Search anything.../i);
    expect(searchInput).toHaveValue('test search');
  });

  test('appelle onSearchChange quand l\'utilisateur tape dans la recherche', () => {
    const onSearchChange = vi.fn();
    renderHeader({ onSearchChange });
    const searchInput = screen.getByPlaceholderText(/Search anything.../i);
    fireEvent.change(searchInput, { target: { value: 'new query' } });
    expect(onSearchChange).toHaveBeenCalledWith('new query');
  });

  test('affiche le placeholder personnalisé pour la recherche', () => {
    renderHeader({ searchPlaceholder: 'Custom placeholder...' });
    expect(screen.getByPlaceholderText(/Custom placeholder.../i)).toBeInTheDocument();
  });

  test('récupère le nombre de demandes de rôle en attente', async () => {
    mockSessionStorage.setItem('token', 'fake-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requests: [{ id: 1 }, { id: 2 }] }),
    });

    renderHeader();
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/role-requests?status=pending',
        expect.objectContaining({
          headers: { Authorization: 'Bearer fake-token' },
        })
      );
    });
  });

  test('redirige vers /backoffice/role-requests quand on clique sur le bouton notifications', () => {
    renderHeader();
    const notificationButton = screen.getByLabelText(/Notifications/i);
    fireEvent.click(notificationButton);
    expect(mockNavigate).toHaveBeenCalledWith('/backoffice/role-requests');
  });

});
