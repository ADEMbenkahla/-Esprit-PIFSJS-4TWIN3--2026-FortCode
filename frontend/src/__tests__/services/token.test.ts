import { 
  getStoredToken, 
  clearStoredAuth, 
  decodeJwtPayload, 
  isTokenExpired 
} from '../../services/token';

describe('Token Service', () => {
  
  beforeEach(() => {
    // Nettoyer les storages avant chaque test
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('getStoredToken', () => {
    
    test('retourne null si aucun token', () => {
      expect(getStoredToken()).toBeNull();
    });

    test('retourne le token de sessionStorage', () => {
      sessionStorage.setItem('token', 'session-token');
      expect(getStoredToken()).toBe('session-token');
    });

    test('retourne le token de localStorage si sessionStorage vide', () => {
      localStorage.setItem('token', 'local-token');
      expect(getStoredToken()).toBe('local-token');
    });

    test('sessionStorage a priorité sur localStorage', () => {
      sessionStorage.setItem('token', 'session-token');
      localStorage.setItem('token', 'local-token');
      expect(getStoredToken()).toBe('session-token');
    });

  });

  describe('clearStoredAuth', () => {
    
    test('supprime tous les tokens des storages', () => {
      sessionStorage.setItem('token', 'test');
      localStorage.setItem('token', 'test');
      sessionStorage.setItem('userId', '123');
      sessionStorage.setItem('userRole', 'admin');
      
      clearStoredAuth();
      
      expect(sessionStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(sessionStorage.getItem('userId')).toBeNull();
      expect(sessionStorage.getItem('userRole')).toBeNull();
    });

  });

  describe('decodeJwtPayload', () => {
    
    test('retourne null pour un token invalide', () => {
      expect(decodeJwtPayload('invalid')).toBeNull();
      expect(decodeJwtPayload('')).toBeNull();
    });

    test('décode correctement un JWT valide', () => {
      // JWT factice pour test
      const payload = { id: '123', role: 'admin' };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      const result = decodeJwtPayload(token);
      expect(result).toEqual(payload);
    });

    test('gère les erreurs de décodage', () => {
      const token = 'header.invalid-base64!.signature';
      expect(decodeJwtPayload(token)).toBeNull();
    });

  });

  describe('isTokenExpired', () => {
    
    test('retourne true pour token invalide', () => {
      expect(isTokenExpired('invalid')).toBe(true);
      expect(isTokenExpired('')).toBe(true);
    });

    test('retourne true pour token expiré', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 1000;
      const payload = { exp: pastTime };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      expect(isTokenExpired(token)).toBe(true);
    });

    test('retourne false pour token valide (non expiré)', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 1000;
      const payload = { exp: futureTime };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      expect(isTokenExpired(token)).toBe(false);
    });

    test('gère les payloads sans exp', () => {
      const payload = { id: '123' };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      expect(isTokenExpired(token)).toBe(true);
    });

  });

});