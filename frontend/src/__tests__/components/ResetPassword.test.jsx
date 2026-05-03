import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import ResetPassword from '../../pages/ResetPassword';

// --- Mocks ---
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ token: 'test-token-123' }),
  };
});

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));
import Swal from 'sweetalert2';

describe('ResetPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  const renderResetPassword = () =>
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

  test('affiche le formulaire', () => {
    renderResetPassword();
    expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RESET PASSWORD →/i })).toBeInTheDocument();
  });

  test('affiche une erreur si les champs sont vides', async () => {
    renderResetPassword();
    const resetButton = screen.getByRole('button', { name: /RESET PASSWORD →/i });
    await act(async () => {
      fireEvent.click(resetButton);
    });
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'warning', title: 'Missing Fields' })
      );
    });
  });

  test('affiche une erreur si les mots de passe ne correspondent pas', async () => {
    renderResetPassword();
    const passwordInput = screen.getByLabelText(/New Password/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    await userEvent.type(passwordInput, 'newpassword');
    await userEvent.type(confirmInput, 'different');
    const resetButton = screen.getByRole('button', { name: /RESET PASSWORD →/i });
    await act(async () => {
      fireEvent.click(resetButton);
    });
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'Password Mismatch' })
      );
    });
  });

  test('appelle l\'API de réinitialisation avec les bons paramètres', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Password reset successful' }),
    });

    renderResetPassword();
    const passwordInput = screen.getByLabelText(/New Password/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    await userEvent.type(passwordInput, 'newpassword123');
    await userEvent.type(confirmInput, 'newpassword123');
    const resetButton = screen.getByRole('button', { name: /RESET PASSWORD →/i });
    await act(async () => {
      fireEvent.click(resetButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/reset-password/test-token-123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ newPassword: 'newpassword123' }),
        })
      );
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('gère l\'échec de l\'API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid or expired token' }),
    });

    renderResetPassword();
    const passwordInput = screen.getByLabelText(/New Password/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    await userEvent.type(passwordInput, 'newpassword123');
    await userEvent.type(confirmInput, 'newpassword123');
    const resetButton = screen.getByRole('button', { name: /RESET PASSWORD →/i });
    await act(async () => {
      fireEvent.click(resetButton);
    });

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'Error', text: 'Invalid or expired token' })
      );
    });
  });

  test('gère l\'erreur de connexion', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    renderResetPassword();
    const passwordInput = screen.getByLabelText(/New Password/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    await userEvent.type(passwordInput, 'newpassword123');
    await userEvent.type(confirmInput, 'newpassword123');
    const resetButton = screen.getByRole('button', { name: /RESET PASSWORD →/i });
    await act(async () => {
      fireEvent.click(resetButton);
    });

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'Connection Error' })
      );
    });
  });
});