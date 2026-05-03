import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActivityTable from '../../pages/backOffice/components/ActivityTable';

// Mock des logs pour les tests
const mockLogs = [
  {
    _id: '1',
    timestamp: '2026-05-02T10:30:00Z',
    user: {
      name: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com',
    },
    method: 'GET',
    route: '/api/users',
    browser: 'Chrome 120',
    os: 'Windows 11',
    device: 'Desktop',
    ip: '192.168.1.100',
  },
  {
    _id: '2',
    timestamp: '2026-05-02T11:00:00Z',
    user: null,
    method: 'POST',
    route: '/api/auth/login',
    browser: 'Firefox 121',
    os: 'macOS 14',
    device: 'Laptop',
    ip: '192.168.1.101',
  },
  {
    _id: '3',
    timestamp: '2026-05-02T12:00:00Z',
    user: {
      name: 'Jane Smith',
      username: 'janesmith',
      email: 'jane@example.com',
    },
    method: 'DELETE',
    route: '/api/users/123',
    browser: 'Safari 17',
    os: 'iOS 17',
    device: 'Mobile',
    ip: '192.168.1.102',
  },
];

describe('ActivityTable Component', () => {
  
  test('affiche le message "No activity logs found" quand la liste est vide', () => {
    render(<ActivityTable logs={[]} />);
    expect(screen.getByText(/No activity logs found/i)).toBeInTheDocument();
  });

  test('affiche la table avec les logs', () => {
    render(<ActivityTable logs={mockLogs} />);
    
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/GET/i)).toBeInTheDocument();
    // Utiliser getAllByText car il y a plusieurs routes
    expect(screen.getAllByText(/\/api\/users/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Chrome 120/i)).toBeInTheDocument();
    expect(screen.getByText(/192.168.1.100/i)).toBeInTheDocument();
    expect(screen.getByText(/192.168.1.101/i)).toBeInTheDocument();
    expect(screen.getByText(/192.168.1.102/i)).toBeInTheDocument();
  });

  test('affiche "Guest / Unknown" pour les utilisateurs non connectés', () => {
    render(<ActivityTable logs={mockLogs} />);
    expect(screen.getByText(/Guest \/ Unknown/i)).toBeInTheDocument();
  });

  test('affiche les couleurs différentes selon la méthode HTTP', () => {
    render(<ActivityTable logs={mockLogs} />);
    
    // GET (bleu)
    const getBadge = screen.getByText('GET');
    expect(getBadge).toHaveClass('bg-blue-500/10');
    
    // POST (vert)
    const postBadge = screen.getByText('POST');
    expect(postBadge).toHaveClass('bg-green-500/10');
    
    // DELETE (rouge)
    const deleteBadge = screen.getByText('DELETE');
    expect(deleteBadge).toHaveClass('bg-red-500/10');
  });

  test('appelle onViewDetails quand on clique sur le bouton détails', () => {
    const onViewDetails = vi.fn();
    render(<ActivityTable logs={mockLogs} onViewDetails={onViewDetails} />);
    
    const viewButtons = screen.getAllByTitle(/View Details/i);
    fireEvent.click(viewButtons[0]);
    
    expect(onViewDetails).toHaveBeenCalledWith('1');
  });

  test('affiche la date formatée correctement', () => {
    render(<ActivityTable logs={mockLogs} />);
    // Le format affiché est "MMM dd, HH:mm:ss"
    // Note: l'heure est ajustée selon le fuseau horaire (UTC+1)
    expect(screen.getByText(/May 02, 11:30:00/i)).toBeInTheDocument();
    expect(screen.getByText(/May 02, 12:00:00/i)).toBeInTheDocument();
    expect(screen.getByText(/May 02, 13:00:00/i)).toBeInTheDocument();
  });

  test('affiche les informations browser/OS/device', () => {
    render(<ActivityTable logs={mockLogs} />);
    expect(screen.getByText(/Windows 11/i)).toBeInTheDocument();
    expect(screen.getByText(/macOS 14/i)).toBeInTheDocument();
    expect(screen.getByText(/iOS 17/i)).toBeInTheDocument();
    expect(screen.getByText(/Desktop/i)).toBeInTheDocument();
    expect(screen.getByText(/Laptop/i)).toBeInTheDocument();
    expect(screen.getByText(/Mobile/i)).toBeInTheDocument();
  });

});