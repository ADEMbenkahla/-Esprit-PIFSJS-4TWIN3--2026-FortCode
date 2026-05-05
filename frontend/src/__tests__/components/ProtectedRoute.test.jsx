import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../../components/ProtectedRoute';

// Mock des services token
vi.mock('../../services/token', () => ({
  getStoredToken: vi.fn(),
  decodeJwtPayload: vi.fn(),
  isTokenExpired: vi.fn(),
}));

import { getStoredToken, decodeJwtPayload, isTokenExpired } from '../../services/token';

describe('ProtectedRoute Component', () => {
  
  const TestChild = () => <div data-testid="protected-content">Contenu protégé</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('redirige vers "/" si aucun token', () => {
    getStoredToken.mockReturnValue(null);
    
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    // Vérifie que le contenu protégé n'est pas affiché
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  test('redirige vers "/" si le token est expiré', () => {
    getStoredToken.mockReturnValue('expired-token');
    isTokenExpired.mockReturnValue(true);
    
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  test('affiche le contenu pour un token valide avec le bon rôle simple', () => {
    getStoredToken.mockReturnValue('valid-token');
    isTokenExpired.mockReturnValue(false);
    decodeJwtPayload.mockReturnValue({ role: 'admin' });
    
    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="admin">
          <TestChild />
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('protected-content')).toBeDefined();
  });

  test('redirige vers "/home" si le rôle est incorrect (simple)', () => {
    getStoredToken.mockReturnValue('valid-token');
    isTokenExpired.mockReturnValue(false);
    decodeJwtPayload.mockReturnValue({ role: 'user' });
    
    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="admin">
          <TestChild />
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  test('affiche le contenu si le rôle est dans la liste autorisée (array)', () => {
    getStoredToken.mockReturnValue('valid-token');
    isTokenExpired.mockReturnValue(false);
    decodeJwtPayload.mockReturnValue({ role: 'admin' });
    
    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole={['admin', 'superadmin']}>
          <TestChild />
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('protected-content')).toBeDefined();
  });

  test('redirige vers "/home" si le rôle n\'est pas dans la liste autorisée', () => {
    getStoredToken.mockReturnValue('valid-token');
    isTokenExpired.mockReturnValue(false);
    decodeJwtPayload.mockReturnValue({ role: 'user' });
    
    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole={['admin', 'superadmin']}>
          <TestChild />
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  test('redirige vers "/" si decodeJwtPayload échoue', () => {
    getStoredToken.mockReturnValue('valid-token');
    isTokenExpired.mockReturnValue(false);
    decodeJwtPayload.mockReturnValue(null);
    
    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="admin">
          <TestChild />
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

});