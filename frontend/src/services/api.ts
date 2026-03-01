import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for API calls
api.interceptors.request.use(
    (config) => {
        // Try sessionStorage first (current session/tab), fallback to localStorage
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for API calls
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            sessionStorage.removeItem('token');
            localStorage.removeItem('token');
            window.location.href = '/'; // Redirect to login
        }

        return Promise.reject(error);
    }
);

export default api;
