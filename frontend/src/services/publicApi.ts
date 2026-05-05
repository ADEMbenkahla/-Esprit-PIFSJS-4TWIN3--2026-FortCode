import axios from 'axios';
import { API_BASE_URL } from '../config';

// Public API client for invitation/guest flows (no auth token, no auto-redirect).
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default publicApi;
