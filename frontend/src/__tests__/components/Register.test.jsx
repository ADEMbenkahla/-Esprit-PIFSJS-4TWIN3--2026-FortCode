import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import Register from '../../pages/Register';

// --- Mocks ---
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));
import Swal from 'sweetalert2';

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  const renderRegister = () =>
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );

  test('affiche le formulaire d\'inscription', () => {
    renderRegister();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CREATE ACCOUNT →/i })).toBeInTheDocument();
  });

  test('affiche une erreur si les champs sont vides', async () => {
    renderRegister();
    const registerButton = screen.getByRole('button', { name: /CREATE ACCOUNT →/i });
    await act(async () => {
      fireEvent.click(registerButton);
    });
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'warning', title: 'Missing Fields' })
      );
    });
  });

  test('affiche une erreur si les mots de passe ne correspondent pas', async () => {
    renderRegister();
    const usernameInput = screen.getByLabelText(/Username/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    
    await userEvent.type(usernameInput, 'testuser');
    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.type(confirmInput, 'different');
    
    const registerButton = screen.getByRole('button', { name: /CREATE ACCOUNT →/i });
    await act(async () => {
      fireEvent.click(registerButton);
    });
    
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'Password Mismatch' })
      );
    });
  });

  test('appelle l\'API d\'inscription avec les bons paramètres', async () => {
    let requestBody = null;
    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({ message: 'Registration successful', requiresVerification: true, email: 'test@test.com' }),
      };
    });

    renderRegister();
    const usernameInput = screen.getByLabelText(/Username/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    
    await userEvent.type(usernameInput, 'testuser');
    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.type(confirmInput, 'password123');
    
    const registerButton = screen.getByRole('button', { name: /CREATE ACCOUNT →/i });
    await act(async () => {
      fireEvent.click(registerButton);
    });

    // Vérifier l'appel fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      })
    );
    
    expect(requestBody).toEqual({
      username: 'testuser',
      email: 'test@test.com',
      password: 'password123',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=testuser'
    });
  });

  test('gère l\'échec de l\'API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Email already exists' }),
    });

    renderRegister();
    const usernameInput = screen.getByLabelText(/Username/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    
    await userEvent.type(usernameInput, 'testuser');
    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.type(confirmInput, 'password123');
    
    const registerButton = screen.getByRole('button', { name: /CREATE ACCOUNT →/i });
    await act(async () => {
      fireEvent.click(registerButton);
    });

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'Registration Failed', text: 'Email already exists' })
      );
    });
  });

  test('gère l\'erreur de connexion', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    renderRegister();
    const usernameInput = screen.getByLabelText(/Username/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    
    await userEvent.type(usernameInput, 'testuser');
    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.type(confirmInput, 'password123');
    
    const registerButton = screen.getByRole('button', { name: /CREATE ACCOUNT →/i });
    await act(async () => {
      fireEvent.click(registerButton);
    });

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'Error', text: 'Error connecting to server' })
      );
    });
  });

  test('affiche l\'aperçu de l\'avatar', () => {
    renderRegister();
    const avatarImg = document.querySelector('.avatar-preview img');
    expect(avatarImg).toBeInTheDocument();
  });
});