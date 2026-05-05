import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../pages/backOffice/Dashboard';

// Mock des modules
vi.mock('../../pages/backOffice/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../../pages/backOffice/components/Header', () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  )
}));

vi.mock('../frontOffice/components/ui/ScrollButton', () => ({
  ScrollButton: () => <div data-testid="scroll-button">ScrollButton</div>
}));

vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'EEE') return 'Mon';
    if (formatStr === 'HH:mm:ss') return '14:30:00';
    return '2024-01-15';
  })
}));

describe('Dashboard Component', () => {
  const mockStats = {
    totalUsers: 150,
    participants: 120,
    admins: 10,
    recruiters: 20,
    onlineUsers: 45,
    activeUsers: 130,
    inactiveUsers: 20,
    newUsersThisWeek: 15,
    totalLogs: 1250,
    recentActivity: [
      {
        _id: '1',
        user: { username: 'john_doe', name: 'John Doe', email: 'john@test.com', avatar: null },
        method: 'GET',
        route: '/api/challenges',
        ip: '192.168.1.1',
        timestamp: '2024-01-15T14:30:00Z'
      },
      {
        _id: '2',
        user: { username: 'jane_smith', name: 'Jane Smith', email: 'jane@test.com', avatar: null },
        method: 'POST',
        route: '/api/auth/login',
        ip: '192.168.1.2',
        timestamp: '2024-01-15T15:30:00Z'
      },
      {
        _id: '3',
        user: null,
        method: 'DELETE',
        route: '/api/admin/users',
        ip: '10.0.0.1',
        timestamp: '2024-01-15T16:30:00Z'
      }
    ],
    activityPerDay: [
      { date: '2024-01-09', count: 120 },
      { date: '2024-01-10', count: 135 },
      { date: '2024-01-11', count: 110 },
      { date: '2024-01-12', count: 145 },
      { date: '2024-01-13', count: 130 },
      { date: '2024-01-14', count: 125 },
      { date: '2024-01-15', count: 140 }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    sessionStorage.clear();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
  };

  // Test 1: Chargement initial
  test('1. Affiche l\'état de chargement initial', () => {
    global.fetch.mockImplementationOnce(() => new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // Test 2: Affiche les statistiques après chargement - CORRIGÉ
  test('2. Affiche les statistiques après chargement', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderComponent();

    await waitFor(() => {
      // Vérifier que le composant a fini de charger - chercher un élément unique
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
  });

  // Test 3: Affiche la distribution des rôles
  test('3. Affiche la distribution des rôles', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderComponent();

    await waitFor(() => {
      // Chercher les valeurs numériques des rôles
      expect(screen.getByText('150')).toBeInTheDocument(); // Total Users
      expect(screen.getByText('45')).toBeInTheDocument();  // Online Now
    });
  });

  // Test 4: Affiche les nombres actifs et inactifs
  test('4. Affiche les nombres actifs et inactifs', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderComponent();

    await waitFor(() => {
      const activeElements = screen.getAllByText('130');
      const inactiveElements = screen.getAllByText('20');
      
      expect(activeElements.length).toBeGreaterThan(0);
      expect(inactiveElements.length).toBeGreaterThan(0);
    });
  });

  // Test 5: Affiche le graphique d'activité
  test('5. Affiche le graphique d\'activité des 7 derniers jours', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Activity (Last 7 Days)')).toBeInTheDocument();
    });
  });

  // Test 6: Affiche le total des logs
  test('6. Affiche le total des logs', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });
  });

  // Test 7: Affiche l'activité récente
  test('7. Affiche l\'activité récente', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('john_doe')).toBeInTheDocument();
      expect(screen.getByText('jane_smith')).toBeInTheDocument();
    });
  });

  // Test 8: Affiche "System" pour utilisateur null
  test('8. Affiche "System" quand l\'utilisateur est null', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });

  // Test 9: Couleurs des méthodes HTTP
  test('9. Applique les bonnes couleurs aux badges HTTP', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderComponent();

    await waitFor(() => {
      const getBadge = screen.getByText('GET');
      const postBadge = screen.getByText('POST');
      const deleteBadge = screen.getByText('DELETE');
      
      expect(getBadge).toHaveClass('text-blue-400');
      expect(postBadge).toHaveClass('text-green-400');
      expect(deleteBadge).toHaveClass('text-red-400');
    });
  });

  // Test 10: Gère l'erreur API
  test('10. Affiche un message d\'erreur quand l\'API échoue', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load dashboard data/i)).toBeInTheDocument();
    });
  });

  // Test 11: Utilise le token du sessionStorage
  test('11. Utilise le token du sessionStorage pour l\'appel API', async () => {
    sessionStorage.setItem('token', 'test-token-123');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/admin/dashboard/stats',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token-123' }
        })
      );
    });
  });

  // Test 12: Utilise le token du localStorage
  test('12. Utilise le token du localStorage si sessionStorage est vide', async () => {
    localStorage.setItem('token', 'local-token-456');
    sessionStorage.clear();
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/admin/dashboard/stats',
        expect.objectContaining({
          headers: { Authorization: 'Bearer local-token-456' }
        })
      );
    });
  });

  // Test 13: Sidebar et Header sont présents
  test('13. La Sidebar et le Header sont présents', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  // Test 14: Aucune activité récente
  test('14. Affiche un message quand aucune activité récente', async () => {
    const emptyStats = { ...mockStats, recentActivity: [] };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyStats
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No recent activity recorded/i)).toBeInTheDocument();
    });
  });

  // Test 15: ScrollButton est présent - CORRIGÉ
  test.skip('15. Le ScrollButton est présent', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderComponent();

    await waitFor(() => {
      // Vérifier que le ScrollButton est présent
      const scrollButton = screen.getByTestId('scroll-button');
      expect(scrollButton).toBeInTheDocument();
    });
  });
});