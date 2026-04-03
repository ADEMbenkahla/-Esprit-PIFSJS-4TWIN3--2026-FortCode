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

export const requestVirtualRoom = () => {
    return api.post('/recruiter/virtual-room/request');
};

export const getMyVirtualRoomRequest = () => {
    return api.get('/recruiter/virtual-room/request');
};

/** Delete current user account (participant only). Requires email + password or confirmation phrase. */
export const deleteMyAccount = (data: { email: string; password?: string; confirmationPhrase?: string }) =>
    api.delete('/auth/profile', { data });

// Battle Rooms (User Stories 4.4, 4.5, 4.6)
export const getParticipants = () => api.get('/recruiter/participants');
export const createBattleRoom = (data: {
    title: string;
    description?: string;
    participantIds?: string[];
    challenge?: { title: string; description?: string; starterCode?: string; language?: string };
    timeLimitMinutes: number;
}) => api.post('/recruiter/battle-rooms', data);
export const getMyBattleRooms = (status?: string) =>
    api.get('/recruiter/battle-rooms', status ? { params: { status } } : {});
export const getBattleRoom = (id: string) => api.get(`/recruiter/battle-rooms/${id}`);
export const updateBattleRoomStatus = (id: string, status: string) =>
    api.patch(`/recruiter/battle-rooms/${id}`, { status });
export const getBattleRoomSubmissions = (id: string) => api.get(`/recruiter/battle-rooms/${id}/submissions`);
export const updateSubmissionEvaluation = (
    roomId: string,
    subId: string,
    data: { recruiterComment?: string; recruiterRating?: number }
) => api.patch(`/recruiter/battle-rooms/${roomId}/submissions/${subId}`, data);

export default api;
