import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import BattleInvite from '../../pages/BattleInvite';

// --- Mocks ---
vi.mock('../../guards/RouteGuards', () => ({
  getUserRole: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  getBattleInvitationPreview: vi.fn(),
  acceptBattleInvitation: vi.fn(),
}));

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

import { getUserRole } from '../../guards/RouteGuards';
import { getBattleInvitationPreview, acceptBattleInvitation } from '../../services/api';
import Swal from 'sweetalert2';

// Mock window.location pour les redirections
const originalLocation = window.location;
beforeEach(() => {
  delete window.location;
  window.location = { href: '' };
});
afterEach(() => {
  window.location = originalLocation;
});

describe('BattleInvite Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserRole.mockReturnValue(null);
    sessionStorage.clear();
    localStorage.clear();
  });

  // Rendu avec MemoryRouter et une route qui contient le token
  const renderBattleInvite = (token = 'test-token-123') => {
    return render(
      <MemoryRouter initialEntries={[`/battle-invite?token=${token}`]}>
        <Routes>
          <Route path="/battle-invite" element={<BattleInvite />} />
        </Routes>
      </MemoryRouter>
    );
  };

  test.skip('affiche le formulaire avec un token valide', async () => {
    const mockPreview = {
      room: {
        title: 'Battle Royale',
        challenge: { title: 'JavaScript Challenge' },
        timeLimitMinutes: 30,
        recruiter: { username: 'recruiter1' },
      },
      invitation: { email: 'invited@test.com' },
    };
    getBattleInvitationPreview.mockResolvedValueOnce({ data: mockPreview });

    renderBattleInvite();

    await waitFor(() => {
      expect(screen.getByText(/Battle Royale/i)).toBeInTheDocument();
      expect(screen.getByText(/JavaScript Challenge/i)).toBeInTheDocument();
      expect(screen.getByText(/30 minutes/i)).toBeInTheDocument();
      expect(screen.getByText(/invited@test.com/i)).toBeInTheDocument();
    });
  });

  test('affiche une erreur si le token est invalide', async () => {
    getBattleInvitationPreview.mockRejectedValueOnce({
      response: { data: { message: 'Invalid or expired invitation' } },
    });

    renderBattleInvite('invalid-token');

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'Invitation unavailable' })
      );
    });
  });

  test('affiche une alerte si le code est vide', async () => {
    const mockPreview = {
      room: { title: 'Test Room', timeLimitMinutes: 15 },
      invitation: { email: 'test@test.com' },
    };
    getBattleInvitationPreview.mockResolvedValueOnce({ data: mockPreview });

    renderBattleInvite();

    await waitFor(() => {
      expect(screen.getByText(/Test Room/i)).toBeInTheDocument();
    });

    const acceptButton = screen.getByRole('button', { name: /Accept Invitation/i });
    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'warning', title: 'Code required' })
      );
    });
  });

  test('appelle acceptBattleInvitation avec le token et le code', async () => {
    const mockPreview = {
      room: { title: 'Test Room', timeLimitMinutes: 15 },
      invitation: { email: 'test@test.com' },
    };
    const mockAcceptResponse = {
      data: {
        token: 'new-auth-token',
        user: { _id: 'user123' },
        room: { _id: 'room456' },
      },
    };
    getBattleInvitationPreview.mockResolvedValueOnce({ data: mockPreview });
    acceptBattleInvitation.mockResolvedValueOnce(mockAcceptResponse);

    renderBattleInvite();

    await waitFor(() => {
      expect(screen.getByText(/Test Room/i)).toBeInTheDocument();
    });

    const codeInput = screen.getByPlaceholderText(/Enter the 6-digit code/i);
    await userEvent.type(codeInput, '123456');
    const acceptButton = screen.getByRole('button', { name: /Accept Invitation/i });
    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(acceptBattleInvitation).toHaveBeenCalledWith({
        token: 'test-token-123',
        code: '123456',
      });
    });
  });

  test('gère l\'échec de acceptation', async () => {
    const mockPreview = {
      room: { title: 'Test Room', timeLimitMinutes: 15 },
      invitation: { email: 'test@test.com' },
    };
    getBattleInvitationPreview.mockResolvedValueOnce({ data: mockPreview });
    acceptBattleInvitation.mockRejectedValueOnce({
      response: { data: { message: 'Invalid code' } },
    });

    renderBattleInvite();

    await waitFor(() => {
      expect(screen.getByText(/Test Room/i)).toBeInTheDocument();
    });

    const codeInput = screen.getByPlaceholderText(/Enter the 6-digit code/i);
    await userEvent.type(codeInput, 'wrong');
    const acceptButton = screen.getByRole('button', { name: /Accept Invitation/i });
    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'Could not accept invitation' })
      );
    });
  });

  test('affiche le message pour utilisateur connecté', async () => {
    getUserRole.mockReturnValue('participant');
    const mockPreview = {
      room: { title: 'Test Room', timeLimitMinutes: 15 },
      invitation: { email: 'test@test.com' },
    };
    getBattleInvitationPreview.mockResolvedValueOnce({ data: mockPreview });

    renderBattleInvite();

    await waitFor(() => {
      expect(screen.getByText(/You are logged in./i)).toBeInTheDocument();
    });
  });
});