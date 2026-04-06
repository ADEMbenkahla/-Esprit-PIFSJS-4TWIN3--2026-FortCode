import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Composant pour protéger les routes basées sur le rôle utilisateur
 */
export function ProtectedRoute({ children, requiredRole }) {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  
  // Si pas de token, rediriger vers login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Vérifier le rôle dans le JWT
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userRole =
      payload.role != null ? String(payload.role).toLowerCase().trim() : payload.role;
    const allowed = Array.isArray(requiredRole)
      ? requiredRole.map((r) => String(r).toLowerCase().trim())
      : String(requiredRole).toLowerCase().trim();

    // Si requiredRole est un tableau, vérifier si l'utilisateur a l'un de ces rôles
    if (Array.isArray(requiredRole)) {
      if (!userRole || !allowed.includes(userRole)) {
        console.warn(`❌ Accès refusé: rôle requis ${requiredRole}, mais rôle utilisateur est ${payload.role}`);
        return <Navigate to="/home" replace />;
      }
    } else {
      if (userRole !== allowed) {
        console.warn(`❌ Accès refusé: rôle requis ${requiredRole}, mais rôle utilisateur est ${payload.role}`);
        return <Navigate to="/home" replace />;
      }
    }

    // L'utilisateur a le bon rôle
    return children;
  } catch (error) {
    console.error('❌ Erreur vérification token:', error);
    return <Navigate to="/" replace />;
  }
}
