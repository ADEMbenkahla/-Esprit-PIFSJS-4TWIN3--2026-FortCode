import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import UserTracker from '../../pages/backOffice/UserTracker';

// Mock des modules
vi.mock('../../pages/backOffice/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../../pages/backOffice/components/Header', () => ({
  default: ({ title, subtitle, searchQuery, onSearchChange, searchPlaceholder }) => (
    <div data-testid="header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <input
        data-testid="search-input"
        placeholder={searchPlaceholder}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  )
}));

// Mock du UserTable
vi.mock('../../pages/backOffice/components/UserTable', () => ({
  default: ({ users, selectedUserId, onSelectUser, onEditUser }) => (
    <div data-testid="user-table">
      {users && users.length > 0 ? (
        <table>
          <tbody>
            {users.map(user => (
              <tr key={user._id} data-testid={`user-row-${user._id}`}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <button onClick={() => onSelectUser(user._id)}>Select</button>
                  <button onClick={() => onEditUser(user)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div data-testid="no-users">No users found</div>
      )}
      {selectedUserId && <div data-testid="selected-user-id">{selectedUserId}</div>}
    </div>
  )
}));

vi.mock('../../pages/backOffice/components/UserDetails', () => ({
  default: ({ user, onClose, onUserUpdated }) => (
    <div data-testid="user-details">
      <h3>{user?.username}</h3>
      <p>{user?.email}</p>
      <button onClick={onClose}>Close</button>
      <button onClick={onUserUpdated}>Refresh</button>
    </div>
  )
}));

vi.mock('../../pages/backOffice/components/AddUserModal', () => ({
  default: ({ isOpen, onClose, onUserCreated }) => 
    isOpen ? (
      <div data-testid="add-user-modal">
        <h3>Add User</h3>
        <button onClick={onUserCreated}>Create</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

vi.mock('../../pages/backOffice/components/EditUserModal', () => ({
  default: ({ isOpen, onClose, onUserUpdated, user }) => 
    isOpen ? (
      <div data-testid="edit-user-modal">
        <h3>Edit User: {user?.username}</h3>
        <button onClick={onUserUpdated}>Update</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({
    socket: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }),
}));

vi.mock('../frontOffice/components/ui/ScrollButton', () => ({
  ScrollButton: () => null
}));

// Mock des storages
const createStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
};

const mockSessionStorage = createStorageMock();
const mockLocalStorage = createStorageMock();

Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

global.fetch = vi.fn();

const mockUsers = [
  {
    _id: '1',
    username: 'admin',
    email: 'admin@test.com',
    role: 'admin',
    isActive: true,
    isOnline: true,
    avatar: 'https://example.com/admin.jpg',
    gamification: { points: 5000, level: 10, rank: 'Gold' }
  },
  {
    _id: '2',
    username: 'participant1',
    email: 'participant1@test.com',
    role: 'participant',
    isActive: true,
    isOnline: false,
    avatar: 'https://example.com/participant1.jpg',
    gamification: { points: 1000, level: 3, rank: 'Bronze' }
  },
  {
    _id: '3',
    username: 'recruiter1',
    email: 'recruiter1@test.com',
    role: 'recruiter',
    isActive: true,
    isOnline: true,
    avatar: 'https://example.com/recruiter1.jpg',
    gamification: { points: 2000, level: 5, rank: 'Silver' }
  }
];

describe('UserTracker Component - Tests Complets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    global.fetch.mockReset();
    mockSessionStorage.setItem('token', 'test-token-123');
    
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        users: mockUsers,
        totalPages: 1,
        totalUsers: 3
      })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <UserTracker />
      </BrowserRouter>
    );
  };

  // ==================== TESTS DE RENDU ====================

  test('1. le composant se render sans erreur', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('User Tracker')).toBeInTheDocument();
    });
  });

  test('2. affiche la sidebar', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
  });

  test('3. affiche le header', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  test('4. affiche la table des utilisateurs', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('user-table')).toBeInTheDocument();
    });
  });

  // ==================== TESTS DES FILTRES ====================

  test('5. filtre par rôle Admin', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('User Tracker')).toBeInTheDocument();
    });

    const adminFilter = screen.getByText('Admins');
    fireEvent.click(adminFilter);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  test('6. filtre par rôle Participants', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('User Tracker')).toBeInTheDocument();
    });

    const participantFilter = screen.getByText('Participants');
    fireEvent.click(participantFilter);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  test('7. filtre par rôle Recruiters', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('User Tracker')).toBeInTheDocument();
    });

    const recruiterFilter = screen.getByText('Recruiters');
    fireEvent.click(recruiterFilter);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  // ==================== TESTS DE RECHERCHE ====================

  test('8. recherche d\'utilisateur', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('User Tracker')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');
    await userEvent.type(searchInput, 'admin');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  // ==================== TESTS DE SÉLECTION D'UTILISATEUR (CORRIGÉ) ====================

  test('9. sélectionne un utilisateur', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('user-table')).toBeInTheDocument();
    });

    // Utiliser getAllByText et prendre le premier
    const selectButtons = screen.getAllByText('Select');
    fireEvent.click(selectButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('user-details')).toBeInTheDocument();
    });
  });

  test('10. ferme les détails utilisateur', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('user-table')).toBeInTheDocument();
    });

    const selectButtons = screen.getAllByText('Select');
    fireEvent.click(selectButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('user-details')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('user-details')).not.toBeInTheDocument();
    });
  });

  // ==================== TESTS MODAL AJOUT ====================

  test('11. ouvre le modal d\'ajout d\'utilisateur', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Add User')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('add-user-modal')).toBeInTheDocument();
    });
  });

  test('12. ferme le modal d\'ajout', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Add User')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('add-user-modal')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('add-user-modal')).not.toBeInTheDocument();
    });
  });

  // ==================== TESTS MODAL ÉDITION ====================

  test('13. ouvre le modal d\'édition d\'utilisateur', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('user-table')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('edit-user-modal')).toBeInTheDocument();
    });
  });

  test('14. ferme le modal d\'édition', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('user-table')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('edit-user-modal')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('edit-user-modal')).not.toBeInTheDocument();
    });
  });

  // ==================== TESTS DE PAGINATION ====================

  test('15. affiche la pagination', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText('Next Page')).toBeInTheDocument();
    });
  });

  test('16. le bouton précédent est désactivé sur la page 1', async () => {
    renderComponent();

    await waitFor(() => {
      const prevButton = screen.getByLabelText('Previous Page');
      expect(prevButton).toBeDisabled();
    });
  });

  // ==================== TESTS D'ERREURS ====================

  test('17. gère l\'erreur lors du chargement des utilisateurs', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderComponent();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});