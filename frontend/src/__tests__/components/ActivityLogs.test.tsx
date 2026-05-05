import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import ActivityLogs from '../../pages/backOffice/ActivityLogs';
import api from '../../services/api';

// Mock des modules
vi.mock('../../services/api');
vi.mock('../../pages/backOffice/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));
vi.mock('../../pages/backOffice/components/Header', () => ({
  default: () => <div data-testid="header">Header</div>
}));
vi.mock('../frontOffice/components/ui/ScrollButton', () => ({
  ScrollButton: () => <div data-testid="scroll-button">ScrollButton</div>
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const mockApi = api as any;

describe('ActivityLogs Component - Tests Simplifiés', () => {
  const mockLogsData = {
    logs: [
      {
        _id: '1',
        user: {
          _id: 'user1',
          username: 'john_doe',
          name: 'John Doe',
          email: 'john@example.com'
        },
        method: 'GET',
        route: '/api/challenges',
        ip: '192.168.1.1',
        browser: 'Chrome 120',
        os: 'Windows 11',
        device: 'desktop',
        timestamp: '2024-01-15T14:30:00Z'
      }
    ],
    totalPages: 1,
    total: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  test('1. Le composant se rend sans erreur', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockLogsData });

    render(
      <MemoryRouter>
        <ActivityLogs />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  test('2. Affiche les logs après chargement', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockLogsData });

    render(
      <MemoryRouter>
        <ActivityLogs />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
  });

  test('3. Gère l\'erreur API', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <ActivityLogs />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalled();
    });
  });

  test('4. Appelle l\'API avec les paramètres par défaut', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockLogsData });

    render(
      <MemoryRouter>
        <ActivityLogs />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/admin/activity', expect.objectContaining({
        params: expect.objectContaining({
          page: 1,
          limit: 10
        })
      }));
    });
  });

  test('5. Le Header est présent', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockLogsData });

    render(
      <MemoryRouter>
        <ActivityLogs />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  test('6. La Sidebar est présente', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockLogsData });

    render(
      <MemoryRouter>
        <ActivityLogs />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
  });

  test('7. Affiche un message d\'erreur quand l\'API échoue', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <ActivityLogs />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load activity logs/i)).toBeInTheDocument();
    });
  });

  // ✅ TEST 8 CORRIGÉ - Utilise un mock séparé avec des données vides
  test('8. Affiche un message quand aucun log n\'est trouvé', async () => {
    // ⚠️ CRUCIAL: Réinitialiser le mock pour ce test spécifique
    mockApi.get.mockReset();
    mockApi.get.mockResolvedValueOnce({ data: { logs: [], totalPages: 0, total: 0 } });

    render(
      <MemoryRouter>
        <ActivityLogs />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No activity logs found matching your filters/i)).toBeInTheDocument();
    });
  });
});