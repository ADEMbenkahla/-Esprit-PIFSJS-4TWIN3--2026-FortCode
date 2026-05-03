import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import AdminStages from '../../pages/backOffice/AdminStages';
import { adminStagesApi, adminChallengesApi } from '../../services/api';

// Mocks des API
vi.mock('../../services/api', () => ({
  adminStagesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    assignChallenges: vi.fn(),
  },
  adminChallengesApi: {
    list: vi.fn(),
  },
}));

// Mock de Swal
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

// Mock de Sidebar (pour éviter les problèmes de routing)
vi.mock('../../pages/backOffice/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

// Mock des hooks de contexte si nécessaire
vi.mock('../../context/SidebarContext', () => ({
  useSidebar: () => ({ isSidebarOpen: false, closeSidebar: vi.fn() })
}));

import Swal from 'sweetalert2';

describe('AdminStages Component', () => {
  const mockStages = [
    {
      _id: 'stage1',
      title: 'JavaScript Basics',
      description: 'Learn JS fundamentals',
      difficulty: 'easy',
      order: 1,
      category: 'training',
      prerequisiteStageId: null,
      challenges: [{ _id: 'ch1', title: 'Challenge 1' }],
    },
    {
      _id: 'stage2',
      title: 'React Basics',
      description: 'Learn React fundamentals',
      difficulty: 'medium',
      order: 2,
      category: 'training',
      prerequisiteStageId: 'stage1',
      challenges: [],
    },
  ];

  const mockChallenges = [
    { _id: 'ch1', title: 'Challenge 1', type: 'Stage', language: 'javascript' },
    { _id: 'ch2', title: 'Challenge 2', type: 'Stage', language: 'javascript' },
    { _id: 'ch3', title: 'Battle Challenge', type: 'Battle', language: 'javascript' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    adminStagesApi.list.mockResolvedValue({ data: mockStages });
    adminChallengesApi.list.mockResolvedValue({ data: mockChallenges });
  });

  // ✅ Envelopper dans BrowserRouter
  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AdminStages />
      </BrowserRouter>
    );
  };

  // Test 1: Chargement initial
  test('1. Affiche l\'état de chargement initial', async () => {
    adminStagesApi.list.mockImplementationOnce(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByText(/Loading…/i)).toBeInTheDocument();
  });

  // Test 2: Affiche les stages après chargement
  test('2. Affiche la liste des stages après chargement', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
      expect(screen.getByText('React Basics')).toBeInTheDocument();
    });
  });

  // Test 3: Ouvre le modal de création
  test('3. Ouvre le modal de création quand on clique sur "Add stage"', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
    });

    const addButton = screen.getByText(/Add stage/i);
    fireEvent.click(addButton);

    expect(screen.getByText(/New stage/i)).toBeInTheDocument();
  });

  // Test 4: Ouvre le modal d'édition
  test('4. Ouvre le modal d\'édition avec les données du stage', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText(/Edit Stage/i);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Edit stage/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('JavaScript Basics')).toBeInTheDocument();
    });
  });

  // Test 5: Crée un nouveau stage
  test('5. Crée un nouveau stage avec succès', async () => {
    const newStage = { _id: 'stage3', title: 'New Stage' };
    adminStagesApi.create.mockResolvedValueOnce({ data: newStage });
    adminStagesApi.assignChallenges.mockResolvedValueOnce({});

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
    });

    const addButton = screen.getByText(/Add stage/i);
    fireEvent.click(addButton);

    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'New Stage' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(adminStagesApi.create).toHaveBeenCalled();
    });
  });
// Test 6: Met à jour un stage
test('6. Met à jour un stage existant avec succès', async () => {
  adminStagesApi.update.mockResolvedValueOnce({});
  adminStagesApi.assignChallenges.mockResolvedValueOnce({});

  renderComponent();

  await waitFor(() => {
    expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
  });

  const editButtons = screen.getAllByLabelText(/Edit Stage/i);
  fireEvent.click(editButtons[0]);

  // ✅ Correction : utiliser userEvent au lieu de fireEvent.clear
  const titleInput = screen.getByLabelText(/Title/i);
  await userEvent.clear(titleInput);
  await userEvent.type(titleInput, 'Updated Title');

  const saveButton = screen.getByRole('button', { name: /Save/i });
  fireEvent.click(saveButton);

  await waitFor(() => {
    expect(adminStagesApi.update).toHaveBeenCalled();
  });
});

  // Test 7: Supprime un stage
  test('7. Supprime un stage après confirmation', async () => {
    adminStagesApi.remove.mockResolvedValueOnce({});
    Swal.fire.mockResolvedValueOnce({ isConfirmed: true });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText(/Delete Stage/i);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(adminStagesApi.remove).toHaveBeenCalledWith('stage1');
    });
  });

  // Test 8: Annule la suppression
  test('8. N\'annule pas la suppression si l\'utilisateur annule', async () => {
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText(/Delete Stage/i);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(adminStagesApi.remove).not.toHaveBeenCalled();
    });
  });

  // Test 9: Sidebar est présent
  test('9. La Sidebar est présente', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
  });
});