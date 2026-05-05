import { describe, test, expect, vi, beforeEach } from 'vitest';
import { refreshUserProfile } from '../../services/userService';
import api from '../../services/api';

// Mock du module api
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('userService', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('refreshUserProfile', () => {
    
    test('met à jour les tokens en sessionStorage et localStorage en cas de succès', async () => {
      const mockResponse = {
        data: {
          token: 'new-token-123',
          role: 'admin',
          user: { id: 1, name: 'Test User' }
        }
      };
      
      (api.post as any).mockResolvedValue(mockResponse);
      
      const result = await refreshUserProfile();
      
      expect(api.post).toHaveBeenCalledWith('/auth/refresh-token');
      expect(sessionStorage.getItem('token')).toBe('new-token-123');
      expect(localStorage.getItem('token')).toBe('new-token-123');
      expect(result).toEqual({
        success: true,
        token: 'new-token-123',
        role: 'admin',
        user: { id: 1, name: 'Test User' }
      });
    });

    test('retourne success: false et l\'erreur en cas d\'échec', async () => {
      const mockError = new Error('Network error');
      (api.post as any).mockRejectedValue(mockError);
      
      const result = await refreshUserProfile();
      
      expect(api.post).toHaveBeenCalledWith('/auth/refresh-token');
      expect(result).toEqual({
        success: false,
        error: mockError
      });
    });

    test('ne modifie pas les tokens si la réponse ne contient pas de token', async () => {
      const mockResponse = {
        data: {
          role: 'admin',
          user: { id: 1 }
        }
      };
      
      (api.post as any).mockResolvedValue(mockResponse);
      
      await refreshUserProfile();
      
      expect(sessionStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });

  });

});