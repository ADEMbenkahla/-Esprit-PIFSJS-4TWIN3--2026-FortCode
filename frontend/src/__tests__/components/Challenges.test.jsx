// src/__tests__/components/Challenges.test.jsx
import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Challenges from '../../pages/backOffice/Challenges';
import { adminChallengesApi, adminStagesApi } from '../../services/api';
import Swal from 'sweetalert2';

// Mock des API avec vi
vi.mock('../../services/api');
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true })
  }
}));

// Mock du hook useSidebar
vi.mock('../../hooks/useSidebar', () => ({
  useSidebar: () => ({
    isSidebarOpen: false,
    closeSidebar: vi.fn(),
    toggleSidebar: vi.fn()
  })
}));

// Mock du composant Sidebar
vi.mock('../../pages/backOffice/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar Mock</div>
}));

describe('Challenges Page - Tests', () => {
  const mockChallenges = [
    {
      _id: '1',
      title: 'First Challenge',
      description: 'First description',
      category: 'algorithms',
      type: 'Stage',
      difficulty: 'medium',
      stageId: { _id: 'stage1', title: 'Stage 1' },
      testCases: [],
      xpReward: 100
    },
    {
      _id: '2',
      title: 'Second Challenge',
      description: 'Second description',
      category: 'data-structures',
      type: 'Battle',
      difficulty: 'hard',
      stageId: null,
      testCases: [],
      xpReward: 150
    }
  ];

  const mockStages = [
    { _id: 'stage1', title: 'Stage 1', level: 1 },
    { _id: 'stage2', title: 'Stage 2', level: 2 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    adminChallengesApi.list.mockResolvedValue({ data: mockChallenges });
    adminStagesApi.list.mockResolvedValue({ data: mockStages });
  });

  // ✅ Wrapper avec BrowserRouter
  const renderWithRouter = (component) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  test('1. Affiche la liste des challenges', async () => {
    renderWithRouter(<Challenges />);
    
    await waitFor(() => {
      expect(screen.getByText('First Challenge')).toBeInTheDocument();
      expect(screen.getByText('Second Challenge')).toBeInTheDocument();
    });
  });

  test('2. Ouvre le modal lors du clic sur "New Challenge"', async () => {
    renderWithRouter(<Challenges />);
    
    await waitFor(() => {
      expect(screen.getByText('First Challenge')).toBeInTheDocument();
    });
    
    // Cliquer sur le bouton "New Challenge"
    const newButton = screen.getByRole('button', { name: /New Challenge/i });
    fireEvent.click(newButton);
    
    // ✅ Chercher le titre du modal qui est dans un h2
    await waitFor(() => {
      const modalTitle = screen.getByRole('heading', { name: /New Challenge/i, level: 2 });
      expect(modalTitle).toBeInTheDocument();
    });
  });

  test('3. Filtre les challenges par recherche', async () => {
    renderWithRouter(<Challenges />);
    
    await waitFor(() => {
      expect(screen.getByText('First Challenge')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Search challenges...');
    fireEvent.change(searchInput, { target: { value: 'Second' } });
    
    await waitFor(() => {
      expect(screen.getByText('Second Challenge')).toBeInTheDocument();
      expect(screen.queryByText('First Challenge')).not.toBeInTheDocument();
    });
  });

  test('4. Ouvre le modal d\'édition', async () => {
    renderWithRouter(<Challenges />);
    
    await waitFor(() => {
      expect(screen.getByText('First Challenge')).toBeInTheDocument();
    });
    
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Edit Challenge')).toBeInTheDocument();
    });
  });

  test('5. Tente de supprimer un challenge', async () => {
    adminChallengesApi.remove.mockResolvedValue({});
    
    renderWithRouter(<Challenges />);
    
    await waitFor(() => {
      expect(screen.getByText('First Challenge')).toBeInTheDocument();
    });
    
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalled();
    });
  });
});