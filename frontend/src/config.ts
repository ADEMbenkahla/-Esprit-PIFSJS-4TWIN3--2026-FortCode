/**
 * Centralized configuration for API URLs.
 * Detects if the app is running on localhost or production (Render).
 */

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Production backend URL on Render (fallback)
const PRODUCTION_BACKEND_URL = 'https://fortcode-backend.onrender.com';

// On Render, VITE_API_URL env var should be set in the dashboard.
// Falls back to the hardcoded production URL so it never resolves to an empty string.
export const BACKEND_URL = isLocalhost
  ? 'http://localhost:5000'
  : (import.meta.env.VITE_API_URL || PRODUCTION_BACKEND_URL);

export const API_BASE_URL = `${BACKEND_URL}/api`;

console.log('API Configuration:', {
  isLocalhost,
  BACKEND_URL,
  API_BASE_URL,
  envApiUrl: import.meta.env.VITE_API_URL
});
