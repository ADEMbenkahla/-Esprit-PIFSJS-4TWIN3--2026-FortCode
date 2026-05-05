import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import UserTable from '../../pages/backOffice/components/UserTable';

// Mock des utilisateurs pour les tests
const mockUsers = [
  {
    _id: '1',
    username: 'john_doe',
    email: 'john@example.com',
    role: 'participant',
    avatar: 'https://example.com/avatar1.jpg',
    isOnline: true,
    gamification: {
      points: 1250,
      level: 5,
      rank: 'Silver',
    },
  },
  {
    _id: '2',
    username: 'jane_smith',
    email: 'jane@example.com',
    role: 'recruiter',
    avatar: 'https://example.com/avatar2.jpg',
    isOnline: false,
    gamification: {
      points: 8500,
      level: 12,
      rank: 'Gold',
    },
  },
  {
    _id: '3',
    username: 'admin_user',
    email: 'admin@example.com',
    role: 'admin',
    avatar: 'https://example.com/avatar3.jpg',
    isOnline: true,
    gamification: {
      points: 25000,
      level: 25,
      rank: 'Diamond',
    },
  },
];

describe('UserTable Component', () => {
  
  const mockOnSelectUser = vi.fn();
  const mockOnEditUser = vi.fn();

  test('affiche le message "Users not found" quand la liste est vide', () => {
    render(
      <UserTable
        users={[]}
        selectedUserId=""
        onSelectUser={mockOnSelectUser}
      />
    );
    expect(screen.getByText(/Users not found/i)).toBeInTheDocument();
  });

  test('affiche la liste des utilisateurs', () => {
    render(
      <UserTable
        users={mockUsers}
        selectedUserId=""
        onSelectUser={mockOnSelectUser}
      />
    );
    
    expect(screen.getByText(/john_doe/i)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/jane_smith/i)).toBeInTheDocument();
    expect(screen.getByText(/admin_user/i)).toBeInTheDocument();
  });

  test('affiche les rôles avec les bonnes couleurs', () => {
    render(
      <UserTable
        users={mockUsers}
        selectedUserId=""
        onSelectUser={mockOnSelectUser}
      />
    );
    
    // Use exact text matching instead of regex to avoid multiple matches
    expect(screen.getByText('PARTICIPANT')).toHaveClass('bg-purple-900/30');
    expect(screen.getByText('RECRUITER')).toHaveClass('bg-blue-900/30');
    expect(screen.getByText('ADMIN')).toHaveClass('bg-red-900/30');
  });

  test('affiche les points XP et le niveau', () => {
    render(
      <UserTable
        users={mockUsers}
        selectedUserId=""
        onSelectUser={mockOnSelectUser}
      />
    );
    
    expect(screen.getByText(/1,250 XP/i)).toBeInTheDocument();
    expect(screen.getByText(/Lvl 5/i)).toBeInTheDocument();
    expect(screen.getByText(/8,500 XP/i)).toBeInTheDocument();
    expect(screen.getByText(/Lvl 12/i)).toBeInTheDocument();
  });

  test('affiche le statut en ligne/hors ligne', () => {
    render(
      <UserTable
        users={mockUsers}
        selectedUserId=""
        onSelectUser={mockOnSelectUser}
      />
    );
    
    // Use getAllByText since multiple users are online
    const onlineStatuses = screen.getAllByText('Online');
    expect(onlineStatuses).toHaveLength(2); // john_doe and admin_user
    onlineStatuses.forEach(status => {
      expect(status).toBeInTheDocument();
    });
    
    // Only one user is offline
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  test('appelle onSelectUser quand on clique sur une ligne', () => {
    render(
      <UserTable
        users={mockUsers}
        selectedUserId=""
        onSelectUser={mockOnSelectUser}
      />
    );
    
    const firstRow = screen.getByText(/john_doe/i).closest('tr');
    if (firstRow) {
      fireEvent.click(firstRow);
      expect(mockOnSelectUser).toHaveBeenCalledWith('1');
    }
  });

  test('affiche la ligne sélectionnée avec la classe appropriée', () => {
    render(
      <UserTable
        users={mockUsers}
        selectedUserId="1"
        onSelectUser={mockOnSelectUser}
      />
    );
    
    const selectedRow = screen.getByText(/john_doe/i).closest('tr');
    expect(selectedRow).toHaveClass('bg-primary/10');
  });

  test('appelle onEditUser quand on clique sur le bouton edit', () => {
    render(
      <UserTable
        users={mockUsers}
        selectedUserId=""
        onSelectUser={mockOnSelectUser}
        onEditUser={mockOnEditUser}
      />
    );
    
    // Trouver et cliquer sur le bouton edit
    const editButtons = screen.getAllByLabelText(/Edit/i);
    fireEvent.click(editButtons[0]);
    
    expect(mockOnEditUser).toHaveBeenCalledWith(mockUsers[0]);
  });

  test('affiche la barre de progression XP correctement', () => {
    render(
      <UserTable
        users={mockUsers}
        selectedUserId=""
        onSelectUser={mockOnSelectUser}
      />
    );
    
    const progressBars = document.querySelectorAll('.bg-gradient-to-r');
    expect(progressBars.length).toBe(mockUsers.length);
  });

  test('affiche l\'avatar par défaut quand aucun avatar n\'est fourni', () => {
    const userWithoutAvatar = [{ ...mockUsers[0], avatar: '' }];
    render(
      <UserTable
        users={userWithoutAvatar}
        selectedUserId=""
        onSelectUser={mockOnSelectUser}
      />
    );
    
    const avatarImg = document.querySelector('img');
    expect(avatarImg).toHaveAttribute('src', '/default-avatar.png');
  });

});