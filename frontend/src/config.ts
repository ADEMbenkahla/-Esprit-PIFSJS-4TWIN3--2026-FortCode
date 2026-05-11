/**
 * Centralized configuration for API URLs.
 * Detects if the app is running on localhost or via ngrok.
 */

// Use the current origin if it's not localhost, assuming it's an ngrok tunnel or production
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// On Render, we use the VITE_API_URL environment variable
export const BACKEND_URL = isLocalhost 
  ? 'http://localhost:5000' 
  : (import.meta.env.VITE_API_URL || '');

export const API_BASE_URL = `${BACKEND_URL}/api`;
