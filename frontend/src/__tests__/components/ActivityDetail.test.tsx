import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import ActivityDetail from '../../pages/backOffice/ActivityDetail';
import api from '../../services/api';

// Mock des modules
vi.mock('../../services/api');
vi.mock('../../pages/backOffice/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));
vi.mock('../../pages/backOffice/components/Header', () => ({
  default: () => <div data-testid="header">Header</div>
}));
vi.mock('date-fns', () => ({
  format: vi.fn(() => 'January 1, 2024 at 12:00 PM')
}));

const mockApi = api as any;

describe('ActivityDetail Component - Tests Complets', () => {
  const mockLog = {
    _id: 'activity123',
    user: {
      _id: 'user456',
      username: 'john_doe',
      name: 'John Doe',
      email: 'john@example.com'
    },
    action: 'VIEW',
    method: 'GET',
    route: '/api/challenges',
    ip: '192.168.1.1',
    referrer: 'https://example.com',
    browser: 'Chrome 120',
    os: 'Windows 11',
    device: 'desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: '2024-01-15T10:00:00Z',
    statusCode: 200,
    responseTime: 150
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== TEST 1: Rendu avec chargement ====================
  test('1. Affiche l\'état de chargement', () => {
    mockApi.get.mockImplementationOnce(() => new Promise(() => {}));
    
    render(
      <MemoryRouter initialEntries={['/admin/activity/activity123']}>
        <Routes>
          <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // ==================== TEST 2: Rendu avec succès ====================
  test('2. Affiche les détails de l\'activité après chargement', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockLog });

    render(
      <MemoryRouter initialEntries={['/admin/activity/activity123']}>
        <Routes>
          <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Activity Details')).toBeInTheDocument();
    });

    expect(screen.getByText(mockLog.user.name)).toBeInTheDocument();
    expect(screen.getByText(mockLog.user.email)).toBeInTheDocument();
    expect(screen.getByText(mockLog.method)).toBeInTheDocument();
    expect(screen.getByText(mockLog.route)).toBeInTheDocument();
    expect(screen.getByText(mockLog.ip)).toBeInTheDocument();
    expect(screen.getByText(mockLog.browser)).toBeInTheDocument();
    expect(screen.getByText(mockLog.os)).toBeInTheDocument();
    expect(screen.getByText(mockLog.device)).toBeInTheDocument();
    expect(screen.getByText(mockLog.userAgent)).toBeInTheDocument();
  });

  // ==================== TEST 3: Affiche les informations utilisateur ====================
  test('3. Affiche correctement les informations utilisateur', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockLog });

    render(
      <MemoryRouter initialEntries={['/admin/activity/activity123']}>
        <Routes>
          <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText(/ID: user456/)).toBeInTheDocument();
    });
  });

  // ==================== TEST 4: Affiche "Unauthenticated User" quand pas d'utilisateur ====================
  test('4. Affiche "Unauthenticated User" quand user est null', async () => {
    const logWithoutUser = { ...mockLog, user: null };
    mockApi.get.mockResolvedValueOnce({ data: logWithoutUser });

    render(
      <MemoryRouter initialEntries={['/admin/activity/activity123']}>
        <Routes>
          <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Unauthenticated User / Guest')).toBeInTheDocument();
    });
  });

  // ==================== TEST 5: Utilise username si name absent ====================
  test('5. Utilise username si name est absent', async () => {
    const logWithoutName = {
      ...mockLog,
      user: { ...mockLog.user, name: null }
    };
    mockApi.get.mockResolvedValueOnce({ data: logWithoutName });

    render(
      <MemoryRouter initialEntries={['/admin/activity/activity123']}>
        <Routes>
          <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('john_doe')).toBeInTheDocument();
    });
  });

  // ==================== TEST 6: Gestion d'erreur API ====================
  test('6. Affiche une erreur quand l\'API échoue', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter initialEntries={['/admin/activity/activity123']}>
        <Routes>
          <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load log details/i)).toBeInTheDocument();
    });
  });

  // ==================== TEST 7: Log non trouvé ====================
  test('7. Affiche "Log not found" quand log est null', async () => {
    mockApi.get.mockResolvedValueOnce({ data: null });

    render(
      <MemoryRouter initialEntries={['/admin/activity/activity123']}>
        <Routes>
          <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Log not found/i)).toBeInTheDocument();
    });
  });

  // ==================== TEST 8: Bouton retour ====================
  test('8. Bouton "Back to Activity Logs" navigue vers la page précédente', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockLog });

    render(
      <MemoryRouter initialEntries={['/admin/activity/activity123']}>
        <Routes>
          <Route path="/admin/activity/:id" element={<ActivityDetail />} />
          <Route path="/admin/activity" element={<div>Activity Logs Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Back to Activity Logs')).toBeInTheDocument();
    });

    const backButton = screen.getByText('Back to Activity Logs');
    await userEvent.click(backButton);

    expect(screen.getByText('Activity Logs Page')).toBeInTheDocument();
  });

  // ==================== TEST 9: Affiche "-" quand referrer absent ====================
  test('9. Affiche "-" quand referrer est absent', async () => {
    const logWithoutReferrer = { ...mockLog, referrer: null };
    mockApi.get.mockResolvedValueOnce({ data: logWithoutReferrer });

    render(
      <MemoryRouter initialEntries={['/admin/activity/activity123']}>
        <Routes>
          <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      const dashElements = screen.getAllByText('-');
      expect(dashElements.length).toBeGreaterThan(0);
    });
  });

  // ==================== TEST 10: Affiche l'ID du log ====================
  test('10. Affiche l\'ID du log', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockLog });

    render(
      <MemoryRouter initialEntries={['/admin/activity/activity123']}>
        <Routes>
          <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('activity123')).toBeInTheDocument();
    });
  });

  // ==================== TEST 11: Sidebar et Header sont rendus ====================
  test('11. Sidebar et Header sont rendus', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockLog });

    render(
      <MemoryRouter initialEntries={['/admin/activity/activity123']}>
        <Routes>
          <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  // ==================== TEST 12: Formatage de la date ====================
  test('12. La date est formatée avec date-fns', async () => {
    const { format } = await import('date-fns');
    mockApi.get.mockResolvedValueOnce({ data: mockLog });

    render(
      <MemoryRouter initialEntries={['/admin/activity/activity123']}>
        <Routes>
          <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('January 1, 2024 at 12:00 PM')).toBeInTheDocument();
    });
  });
});