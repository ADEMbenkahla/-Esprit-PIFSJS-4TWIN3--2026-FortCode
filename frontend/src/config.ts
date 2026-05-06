/**
 * Centralized configuration for API URLs.
 * Detects if the app is running on localhost or via ngrok.
 */

// Use the current origin if it's not localhost, assuming it's an ngrok tunnel or production
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// If we are on ngrok/production, we likely want to talk to the same base URL (or a specific ngrok one)
const NGROK_BACKEND_URL = 'https://recede-hydration-recharger.ngrok-free.dev';
const LOCAL_BACKEND_URL = 'http://localhost:5000';

export const BACKEND_URL = isLocalhost ? LOCAL_BACKEND_URL : NGROK_BACKEND_URL;

export const API_BASE_URL = `${BACKEND_URL}/api`;
