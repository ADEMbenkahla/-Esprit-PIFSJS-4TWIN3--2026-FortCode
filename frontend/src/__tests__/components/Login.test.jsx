import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import Login from '../../pages/Login';

// --- Mocks ---
const mockNavigate = vi.fn();
const mockConnect = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ search: '', pathname: '/' }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

vi.mock('../context/SocketContext', () => ({
  useSocket: () => ({ connect: mockConnect }),
}));

vi.mock('../guards/RouteGuards', () => ({
  getUserRole: vi.fn(() => null),
}));

vi.mock('../services/token', () => ({
  decodeJwtPayload: vi.fn((token) => {
    if (token && token.includes('participant')) return { id: '123', role: 'participant' };
    if (token && token.includes('admin')) return { id: '123', role: 'admin' };
    if (token && token.includes('recruiter')) return { id: '123', role: 'recruiter' };
    return null;
  }),
}));

// Mock de Swal avec une fonction simple
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

vi.mock('../components/FaceAuthModal', () => ({
  default: ({ isOpen, onClose, onCapture }) =>
    isOpen ? (
      <div data-testid="face-modal">
        <div data-testid="face-modal-title">Face Authentication</div>
        <button onClick={() => onCapture({ descriptor: 'mock-descriptor' })}>Capture Face</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Importer Swal après le mock
import Swal from 'sweetalert2';

// Helper
const createMockToken = (role, id = '123') => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const payload = { id, role, exp };
  const encoded = btoa(JSON.stringify(payload));
  return `header.${encoded}.signature`;
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    window.dispatchEvent = vi.fn();
    global.fetch = vi.fn();
  });

  const renderLogin = () =>
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

  test('affiche le formulaire de connexion', () => {
    renderLogin();
    expect(screen.getByLabelText(/Username or Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SIGN IN →/i })).toBeInTheDocument();
  });

  test('affiche une erreur si les champs sont vides', async () => {
    renderLogin();
    const loginButton = screen.getByRole('button', { name: /SIGN IN →/i });
    await act(async () => {
      fireEvent.click(loginButton);
    });
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'warning', title: 'Missing Fields' })
      );
    });
  });

  test('appelle l\'API de connexion et redirige un participant', async () => {
    const mockToken = createMockToken('participant');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: mockToken }),
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/Username or Email Address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'password123');
    const loginButton = screen.getByRole('button', { name: /SIGN IN →/i });
    await act(async () => {
      fireEvent.click(loginButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ identifier: 'test@example.com', password: 'password123' }),
        })
      );
    });
    await waitFor(() => {
      expect(sessionStorage.getItem('token')).toBe(mockToken);
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
  });

  test('gère l\'échec de connexion', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' }),
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/Username or Email Address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'wrong');
    const loginButton = screen.getByRole('button', { name: /SIGN IN →/i });
    await act(async () => {
      fireEvent.click(loginButton);
    });

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'Login Failed' })
      );
    });
  });

  test('affiche le modal de connexion faciale', async () => {
  renderLogin();
  await userEvent.type(screen.getByLabelText(/Username or Email Address/i), 'test@example.com');
  
  // Cliquer sur le bouton "LOGIN WITH FACE ID"
  const faceButton = screen.getByRole('button', { name: /LOGIN WITH FACE ID/i });
  await act(async () => {
    fireEvent.click(faceButton);
  });
  
  
  // ✅ Vérifier que le modal s'ouvre avec son titre
  await waitFor(() => {
    expect(screen.getByText(/Face ID Login/i)).toBeInTheDocument();
  });
});

  test('bouton Google redirige vers OAuth', () => {
    delete window.location;
    window.location = { href: '' };
    renderLogin();
    const googleButton = screen.getByRole('button', { name: /Google/i });
    fireEvent.click(googleButton);
    expect(window.location.href).toBe('http://127.0.0.1:5000/api/auth/google');
  });
});