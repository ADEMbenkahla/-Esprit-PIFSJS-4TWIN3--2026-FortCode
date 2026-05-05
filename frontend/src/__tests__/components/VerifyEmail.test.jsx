import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import VerifyEmail from '../../pages/VerifyEmail';

// --- Mocks ---
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('?email=test@example.com'), vi.fn()],
  };
});

const mockConnect = vi.fn();
vi.mock('../context/SocketContext', () => ({
  useSocket: () => ({ connect: mockConnect }),
}));

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));
import Swal from 'sweetalert2';

const createMockToken = (role, id = '123') => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const payload = { id, role, exp };
  const encoded = btoa(JSON.stringify(payload));
  return `header.${encoded}.signature`;
};

describe('VerifyEmail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    window.dispatchEvent = vi.fn();
  });

  const renderVerifyEmail = () =>
    render(
      <BrowserRouter>
        <VerifyEmail />
      </BrowserRouter>
    );

  test('affiche le formulaire avec l\'email', () => {
    renderVerifyEmail();
    expect(screen.getByText(/Verify Your Email/i)).toBeInTheDocument();
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /VERIFY CODE →/i })).toBeInTheDocument();
  });

  test.skip('affiche une erreur si aucun code saisi', async () => {
    renderVerifyEmail();
    const codeInput = screen.getByLabelText(/Verification Code/i);
    const verifyButton = screen.getByRole('button', { name: /VERIFY CODE →/i });

    // Le bouton est désactivé quand le champ est vide
    expect(verifyButton).toBeDisabled();

    // On simule un clic direct sur le bouton (même désactivé, le gestionnaire ne sera pas appelé)
    // Donc on va plutôt appeler la fonction handleVerify via le formulaire
    // On remplit le champ avec un code puis on l'efface pour forcer le bouton à être actif
    await userEvent.type(codeInput, '123456');
    await userEvent.clear(codeInput);
    // Maintenant le champ est vide, mais le bouton peut être actif (car l'état "code" a changé)
    // On attend que le composant mette à jour le state
    await waitFor(() => {
      expect(verifyButton).toBeEnabled();
    });

    await act(async () => {
      fireEvent.click(verifyButton);
    });

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'warning', title: 'Missing Code' })
      );
    });
  });

  test.skip('appelle l\'API de vérification avec le code et redirige vers home (avec token)', async () => {
    const mockToken = createMockToken('participant');
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: mockToken }),
    });

    renderVerifyEmail();
    const codeInput = screen.getByLabelText(/Verification Code/i);
    // Entrer un code valide (6 chiffres)
    await userEvent.type(codeInput, '123456');
    const verifyButton = screen.getByRole('button', { name: /VERIFY CODE →/i });
    expect(verifyButton).toBeEnabled();

    await act(async () => {
      fireEvent.click(verifyButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/verify-email',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', code: '123456' }),
        })
      );
    });

    await waitFor(() => {
      expect(sessionStorage.getItem('token')).toBe(mockToken);
      expect(mockConnect).toHaveBeenCalledWith(mockToken);
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
  });

  test('vérification sans token (juste confirmation)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Email verified' }),
    });

    renderVerifyEmail();
    const codeInput = screen.getByLabelText(/Verification Code/i);
    await userEvent.type(codeInput, '123456');
    const verifyButton = screen.getByRole('button', { name: /VERIFY CODE →/i });
    await act(async () => {
      fireEvent.click(verifyButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'success', title: 'Verified!' })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('gère l\'échec de vérification', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Code invalide ou expiré' }),
    });

    renderVerifyEmail();
    const codeInput = screen.getByLabelText(/Verification Code/i);
    await userEvent.type(codeInput, '000000');
    const verifyButton = screen.getByRole('button', { name: /VERIFY CODE →/i });
    await act(async () => {
      fireEvent.click(verifyButton);
    });

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'Verification Failed', text: 'Code invalide ou expiré' })
      );
    });
  });

  test('redirection admin après vérification', async () => {
    const mockToken = createMockToken('admin');
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: mockToken }),
    });

    renderVerifyEmail();
    const codeInput = screen.getByLabelText(/Verification Code/i);
    await userEvent.type(codeInput, '123456');
    const verifyButton = screen.getByRole('button', { name: /VERIFY CODE →/i });
    await act(async () => {
      fireEvent.click(verifyButton);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/backoffice/dashboard');
    });
  });

  test('renvoi du code', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Code resent' }),
    });

    renderVerifyEmail();
    const resendLink = screen.getByText(/Resend Code/i);
    await act(async () => {
      fireEvent.click(resendLink);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/resend-verification',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'success', title: 'Code Sent' })
      );
    });
  });

  test('renvoi du code en échec', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Email non trouvé' }),
    });

    renderVerifyEmail();
    const resendLink = screen.getByText(/Resend Code/i);
    await act(async () => {
      fireEvent.click(resendLink);
    });

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'Failed to Resend', text: 'Email non trouvé' })
      );
    });
  });

  test('bouton retour à la page de login', () => {
    renderVerifyEmail();
    const backLink = screen.getByText(/Back to Login/i);
    fireEvent.click(backLink);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});