import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import MyActivity from '../../pages/MyActivity';

// --- Mocks ---
vi.mock('../../pages/backOffice/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('../../pages/backOffice/components/Header', () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock('../../pages/frontOffice/components/ui/ScrollButton', () => ({
  ScrollButton: () => <div data-testid="scroll-button">ScrollButton</div>,
}));

// Mock de api - tout défini à l'intérieur
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock de date-fns
vi.mock('date-fns', () => ({
  format: vi.fn(() => 'Apr 01, 12:00:00'),
}));

// Importer api après les mocks
import api from '../../services/api';

describe('MyActivity Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockLogsResponse = {
    data: {
      logs: [
        {
          _id: '1',
          timestamp: '2026-04-01T12:00:00Z',
          method: 'GET',
          route: '/api/auth/profile',
          browser: 'Chrome 120',
          os: 'Windows 11',
          device: 'Desktop',
          ip: '192.168.1.1',
        },
        {
          _id: '2',
          timestamp: '2026-04-01T13:00:00Z',
          method: 'POST',
          route: '/api/auth/login',
          browser: 'Firefox 115',
          os: 'Mac OS',
          device: 'Laptop',
          ip: '192.168.1.2',
        },
      ],
      totalPages: 3,
      total: 25,
    },
  };

  const renderMyActivity = () =>
    render(
      <BrowserRouter>
        <MyActivity />
      </BrowserRouter>
    );

  test('affiche le composant avec les éléments principaux', async () => {
    api.get.mockResolvedValueOnce(mockLogsResponse);

    renderMyActivity();

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByText(/My Activity History/i)).toBeInTheDocument();
      expect(screen.getByTestId('scroll-button')).toBeInTheDocument();
    });
  });

  test('affiche la liste des logs après chargement', async () => {
    api.get.mockResolvedValueOnce(mockLogsResponse);

    renderMyActivity();

    await waitFor(() => {
      expect(screen.getByText(/GET/i)).toBeInTheDocument();
      expect(screen.getByText(/POST/i)).toBeInTheDocument();
      expect(screen.getByText(/\/api\/auth\/profile/i)).toBeInTheDocument();
      expect(screen.getByText(/\/api\/auth\/login/i)).toBeInTheDocument();
      expect(screen.getByText(/192.168.1.1/i)).toBeInTheDocument();
      expect(screen.getByText(/192.168.1.2/i)).toBeInTheDocument();
    });
  });

  test.skip('affiche un message quand aucun log n\'est trouvé', async () => {
    api.get.mockResolvedValueOnce({ data: { logs: [], totalPages: 1, total: 0 } });

    renderMyActivity();

    await waitFor(() => {
      expect(screen.getByText(/No activity logs found/i)).toBeInTheDocument();
    });
  });

  test.skip('affiche une erreur quand l\'API échoue', async () => {
    api.get.mockRejectedValueOnce(new Error('Network error'));

    renderMyActivity();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load your activity logs/i)).toBeInTheDocument();
    });
  });

  test('les filtres fonctionnent', async () => {
    api.get.mockResolvedValue(mockLogsResponse);

    renderMyActivity();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    const routeInput = screen.getByPlaceholderText(/Route \(e.g. \/api\/auth\)/i);
    await userEvent.type(routeInput, '/api/auth');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/admin/activity/me',
        expect.objectContaining({
          params: expect.objectContaining({ route: '/api/auth' }),
        })
      );
    });
  });

  test('le bouton Clear Filters réinitialise les filtres', async () => {
    api.get.mockResolvedValue(mockLogsResponse);

    renderMyActivity();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    const routeInput = screen.getByPlaceholderText(/Route \(e.g. \/api\/auth\)/i);
    await userEvent.type(routeInput, '/api/test');

    const clearButton = screen.getByText(/Clear Filters/i);
    fireEvent.click(clearButton);

    expect(routeInput).toHaveValue('');
  });

  test.skip('la pagination fonctionne', async () => {
    api.get.mockResolvedValue(mockLogsResponse);

    renderMyActivity();

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument();
    });

    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/admin/activity/me',
        expect.objectContaining({
          params: expect.objectContaining({ page: 2 }),
        })
      );
    });
  });
});