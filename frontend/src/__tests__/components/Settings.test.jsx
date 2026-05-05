import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Settings from '../../pages/backOffice/Settings';
import { SettingsProvider } from '../../context/SettingsContext';

// Mock des modules
vi.mock('../../pages/backOffice/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../../pages/backOffice/components/Header', () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  )
}));

// Mock du composant AvatarPicker - version réaliste
vi.mock('../../components/AvatarPicker', () => ({
  AvatarPicker: ({ currentAvatar, onSelect }) => (
    <div data-testid="avatar-picker">
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full border-4 border-primary/30 overflow-hidden">
          <img src={currentAvatar} alt="Preview" className="w-full h-full object-cover" />
        </div>
        <button 
          type="button"
          onClick={() => onSelect('https://api.dicebear.com/9.x/avataaars/svg?seed=newseed')}
          className="px-3 py-2 text-xs uppercase font-bold rounded-xl bg-primary text-white"
        >
          Avatars
        </button>
      </div>
    </div>
  )
}));

vi.mock('../../components/FaceAuthModal', () => ({
  default: ({ isOpen, onClose, mode, onCapture }) => 
    isOpen ? (
      <div data-testid="face-modal">
        <h3>Face ID {mode === 'register' ? 'Registration' : 'Login'}</h3>
        <button onClick={() => onCapture([0.1, 0.2, 0.3])}>Capture Face</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

vi.mock('../../hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({
    playClick: vi.fn(),
    playSuccess: vi.fn(),
  }),
}));

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

// Mock du contexte Settings
const mockUpdateUsername = vi.fn().mockResolvedValue({});
const mockUpdateAvatar = vi.fn();
const mockRegisterFace = vi.fn().mockResolvedValue({});

// Variable pour contrôler faceRegistered dans les tests
let mockFaceRegistered = false;

vi.mock('../../context/SettingsContext', async () => {
  const actual = await vi.importActual('../../context/SettingsContext');
  return {
    ...actual,
    useSettings: () => ({
      username: 'testuser',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=kfxa2x',
      faceRegistered: mockFaceRegistered,
      updateUsername: mockUpdateUsername,
      updateAvatar: mockUpdateAvatar,
      registerFace: mockRegisterFace,
    }),
  };
});

import Swal from 'sweetalert2';

describe('Settings Component - Tests Complets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFaceRegistered = false;
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <SettingsProvider>
          <Settings />
        </SettingsProvider>
      </BrowserRouter>
    );
  };

  // ==================== TESTS DE RENDU ====================

  test('1. le composant se render sans erreur', () => {
    renderComponent();
    expect(screen.getByText('Account Settings')).toBeInTheDocument();
  });

  test('2. affiche la section Profile Information', () => {
    renderComponent();
    expect(screen.getByText('Profile Information')).toBeInTheDocument();
  });

  test('3. affiche la section Security & Authentication', () => {
    renderComponent();
    expect(screen.getByText('Security & Authentication')).toBeInTheDocument();
  });

  test.skip('4. affiche l\'AvatarPicker', () => {
    renderComponent();
    expect(screen.getByTestId('avatar-picker')).toBeInTheDocument();
  });

  test('5. affiche le username actuel', () => {
    renderComponent();
    const usernameInput = screen.getByDisplayValue('testuser');
    expect(usernameInput).toBeInTheDocument();
  });

  // ==================== TESTS DE MISE À JOUR DU USERNAME ====================

  test('6. met à jour le username avec succès', async () => {
    renderComponent();

    const usernameInput = screen.getByDisplayValue('testuser');
    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, 'newusername');

    const saveButton = screen.getByText(/Save Changes/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateUsername).toHaveBeenCalledWith('newusername');
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
        icon: 'success',
        title: 'Success!'
      }));
    });
  });

  test('7. ne met pas à jour si le username est identique', async () => {
    renderComponent();

    const saveButton = screen.getByText(/Save Changes/i);
    expect(saveButton).toBeDisabled();
  });

  test('8. ne met pas à jour si le username est vide', async () => {
    renderComponent();

    const usernameInput = screen.getByDisplayValue('testuser');
    await userEvent.clear(usernameInput);

    const saveButton = screen.getByText(/Save Changes/i);
    expect(saveButton).toBeDisabled();
  });

  test('9. gère l\'erreur lors de la mise à jour du username', async () => {
    mockUpdateUsername.mockRejectedValueOnce(new Error('Network error'));

    renderComponent();

    const usernameInput = screen.getByDisplayValue('testuser');
    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, 'newusername');

    const saveButton = screen.getByText(/Save Changes/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
        icon: 'error',
        title: 'Error'
      }));
    });
  });

  // ==================== TESTS DE L'AVATAR ====================

  test.skip('10. met à jour l\'avatar via AvatarPicker', async () => {
    renderComponent();

    // Trouver le bouton "Avatars" dans le composant AvatarPicker
    const avatarButton = screen.getByText('Avatars');
    fireEvent.click(avatarButton);

    await waitFor(() => {
      expect(mockUpdateAvatar).toHaveBeenCalled();
    });
  });

  // ==================== TESTS DU MODAL FACE ID ====================

  test('11. ouvre le modal Face ID', async () => {
    renderComponent();

    const registerButton = screen.getByText(/Register My Face/i);
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByTestId('face-modal')).toBeInTheDocument();
    });
  });

  test('12. affiche "Update Face Scan" quand face est déjà enregistrée', async () => {
    mockFaceRegistered = true;
    
    renderComponent();

    expect(screen.getByText(/Update Face Scan/i)).toBeInTheDocument();
  });

  test('13. enregistre le visage avec succès', async () => {
    renderComponent();

    const registerButton = screen.getByText(/Register My Face/i);
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByTestId('face-modal')).toBeInTheDocument();
    });

    const captureButton = screen.getByText('Capture Face');
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(mockRegisterFace).toHaveBeenCalled();
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Registered!'
      }));
    });
  });

  test('14. gère l\'erreur lors de l\'enregistrement du visage', async () => {
    mockRegisterFace.mockRejectedValueOnce(new Error('Face registration failed'));

    renderComponent();

    const registerButton = screen.getByText(/Register My Face/i);
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByTestId('face-modal')).toBeInTheDocument();
    });

    const captureButton = screen.getByText('Capture Face');
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        text: 'Face registration failed'
      }));
    });
  });

  test('15. ferme le modal Face ID', async () => {
    renderComponent();

    const registerButton = screen.getByText(/Register My Face/i);
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByTestId('face-modal')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('face-modal')).not.toBeInTheDocument();
    });
  });

  // ==================== TESTS DE LA SIDEBAR ET HEADER ====================

  test('16. la Sidebar est présente', () => {
    renderComponent();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  test('17. le Header est présent', () => {
    renderComponent();
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  // ==================== TEST DU COMPTEUR ====================

  test('18. affiche le compteur de caractères', () => {
    renderComponent();
    expect(screen.getByText(/\/20/)).toBeInTheDocument();
  });
});