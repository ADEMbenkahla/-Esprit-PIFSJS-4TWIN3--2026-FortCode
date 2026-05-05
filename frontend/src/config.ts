/**
 * Centralized configuration for API URLs.
 * Detects if the app is running on localhost or via ngrok.
 */

const NGROK_URL = 'https://recede-hydration-recharger.ngrok-free.dev';
const LOCAL_BACKEND_URL = 'http://localhost:5000';

// Logic to determine the backend URL
export const BACKEND_URL = 
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? LOCAL_BACKEND_URL
    : NGROK_URL;

export const API_BASE_URL = `${BACKEND_URL}/api`;
