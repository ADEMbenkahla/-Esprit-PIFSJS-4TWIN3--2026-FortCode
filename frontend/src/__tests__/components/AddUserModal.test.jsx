import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddUserModal from '../../pages/backOffice/components/AddUserModal';

// Mock de sweetalert2
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock de sessionStorage et localStorage
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

// Mock du composant AvatarPicker (chemin corrigé)
vi.mock('../../pages/backOffice/components/AvatarPicker', () => ({
  AvatarPicker: ({ currentAvatar, onSelect }) => (
    <div data-testid="avatar-picker">
      <button onClick={() => onSelect('avatar-url')}>Select Avatar</button>
    </div>
  ),
}));

describe('AddUserModal Component', () => {
  
  const mockOnClose = vi.fn();
  const mockOnUserCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    mockFetch.mockClear();
  });

  test('ne rend rien si isOpen est false', () => {
    render(
      <AddUserModal 
        isOpen={false} 
        onClose={mockOnClose} 
        onUserCreated={mockOnUserCreated} 
      />
    );
    
    expect(screen.queryByText(/Add New User/i)).toBeNull();
  });

  test('rend le modal quand isOpen est true', () => {
    render(
      <AddUserModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onUserCreated={mockOnUserCreated} 
      />
    );
    
    expect(screen.getByText(/Add New User/i)).toBeDefined();
  });

  test('affiche le formulaire avec tous les champs', () => {
    render(
      <AddUserModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onUserCreated={mockOnUserCreated} 
      />
    );
    
    expect(screen.getByText(/Username/i)).toBeDefined();
    expect(screen.getByText(/Email/i)).toBeDefined();
    expect(screen.getByText(/Password/i)).toBeDefined();
    expect(screen.getByText(/Role/i)).toBeDefined();
  });

  test('appelle onClose quand le bouton Cancel est cliqué', () => {
    render(
      <AddUserModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onUserCreated={mockOnUserCreated} 
      />
    );
    
    const cancelButton = screen.getByText(/Cancel/i);
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('affiche le composant AvatarPicker', () => {
    render(
      <AddUserModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onUserCreated={mockOnUserCreated} 
      />
    );
    
    expect(screen.getByTestId('avatar-picker')).toBeDefined();
  });

  test('soumet le formulaire avec les données valides', async () => {
    mockSessionStorage.setItem('token', 'fake-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'User created' }),
    });

    render(
      <AddUserModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onUserCreated={mockOnUserCreated} 
      />
    );
    
    // Remplir les champs
    const usernameInput = screen.getByPlaceholderText(/john_doe/i);
    const emailInput = screen.getByPlaceholderText(/user@fortcode.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    const submitButton = screen.getByText(/Create User/i);
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

});