import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditUserModal from '../../pages/backOffice/components/EditUserModal';

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

// Mock du composant AvatarPicker
vi.mock('../../pages/backOffice/components/AvatarPicker', () => ({
  AvatarPicker: ({ currentAvatar, onSelect }) => (
    <div data-testid="avatar-picker">
      <button onClick={() => onSelect('avatar-url')}>Select Avatar</button>
    </div>
  ),
}));

// Mock user pour les tests
const mockUser = {
  _id: 'user123',
  username: 'testuser',
  email: 'test@test.com',
  role: 'participant',
  avatar: '',
  gamification: {
    rank: 'Iron',
    level: 1,
    points: 0
  }
};

describe('EditUserModal Component', () => {
  
  const mockOnClose = vi.fn();
  const mockOnUserUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    mockFetch.mockClear();
  });

  test('ne rend rien si isOpen est false', () => {
    render(
      <EditUserModal 
        isOpen={false} 
        onClose={mockOnClose} 
        onUserUpdated={mockOnUserUpdated} 
        user={mockUser}
      />
    );
    
    expect(screen.queryByText(/Edit User/i)).toBeNull();
  });

  test('ne rend rien si user est null', () => {
    render(
      <EditUserModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onUserUpdated={mockOnUserUpdated} 
        user={null}
      />
    );
    
    expect(screen.queryByText(/Edit User/i)).toBeNull();
  });

  test('rend le modal quand isOpen est true et user existe', () => {
    render(
      <EditUserModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onUserUpdated={mockOnUserUpdated} 
        user={mockUser}
      />
    );
    
    expect(screen.getByText(/Edit User/i)).toBeDefined();
  });

  test('affiche les champs avec les valeurs de l\'utilisateur', () => {
    render(
      <EditUserModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onUserUpdated={mockOnUserUpdated} 
        user={mockUser}
      />
    );
    
    expect(screen.getByDisplayValue('testuser')).toBeDefined();
    expect(screen.getByDisplayValue('test@test.com')).toBeDefined();
  });

  test('appelle onClose quand le bouton Cancel est cliqué', () => {
    render(
      <EditUserModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onUserUpdated={mockOnUserUpdated} 
        user={mockUser}
      />
    );
    
    const cancelButton = screen.getByText(/Cancel/i);
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('affiche le composant AvatarPicker', () => {
    render(
      <EditUserModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onUserUpdated={mockOnUserUpdated} 
        user={mockUser}
      />
    );
    
    expect(screen.getByTestId('avatar-picker')).toBeDefined();
  });

  test('soumet le formulaire avec les données modifiées', async () => {
    mockSessionStorage.setItem('token', 'fake-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'User updated' }),
    });

    render(
      <EditUserModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onUserUpdated={mockOnUserUpdated} 
        user={mockUser}
      />
    );
    
    // Modifier le username
    const usernameInput = screen.getByDisplayValue('testuser');
    fireEvent.change(usernameInput, { target: { value: 'updateduser' } });
    
    const submitButton = screen.getByText(/Update User/i);
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

});