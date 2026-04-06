import axios from 'axios';

// Public API client for invitation/guest flows (no auth token, no auto-redirect).
const publicApi = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default publicApi;
