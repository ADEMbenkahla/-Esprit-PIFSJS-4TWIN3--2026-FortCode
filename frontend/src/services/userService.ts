import api from './api';

/**
 * Refresh l'utilisateur depuis le serveur et met à jour le token JWT
 * Utile après un changement de rôle ou d'autres mises à jour de profil
 */
export const refreshUserProfile = async () => {
  try {
    const response = await api.post('/auth/refresh-token');
    
    if (response.data.token) {
      // Mettre à jour le token dans le sessionStorage et localStorage
      sessionStorage.setItem('token', response.data.token);
      localStorage.setItem('token', response.data.token);
      
      // Retourner les données utilisateur à jour
      return {
        success: true,
        token: response.data.token,
        role: response.data.role,
        user: response.data.user
      };
    }
  } catch (error) {
    console.error('Error refreshing user profile:', error);
    return {
      success: false,
      error: error
    };
  }
};
