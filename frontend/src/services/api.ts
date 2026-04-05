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

        // Only 401 = not authenticated — clear session and go to login.
        // 403 = forbidden (wrong role, etc.) — keep the user logged in so they are not kicked out of the app.
        if (error.response?.status === 401) {
            sessionStorage.removeItem('token');
            localStorage.removeItem('token');
            window.location.href = '/';
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

export const stagesApi = {
    me: (params?: { category?: string }) => api.get('/stages/me', { params }),
    get: (id: string) => api.get(`/stages/${id}`),
    run: (stageId: string, challengeId: string, code: string) =>
        api.post(`/stages/${stageId}/challenges/${challengeId}/run`, { code }),
    submit: (stageId: string, challengeId: string, code: string) =>
        api.post(`/stages/${stageId}/challenges/${challengeId}/submit`, { code }),
    resetStage: (stageId: string, challengeId?: string) =>
        api.post(`/stages/${stageId}/reset`, challengeId ? { challengeId } : {}),
};

export const adminStagesApi = {
    list: () => api.get('/stages'),
    get: (id: string) => api.get(`/stages/${id}`),
    create: (body: Record<string, unknown>) => api.post('/stages', body),
    update: (id: string, body: Record<string, unknown>) => api.put(`/stages/${id}`, body),
    remove: (id: string) => api.delete(`/stages/${id}`),
    assignChallenges: (id: string, challengeIds: string[]) =>
        api.post(`/stages/${id}/challenges`, { challengeIds }),
    removeChallenge: (stageId: string, challengeId: string) =>
        api.delete(`/stages/${stageId}/challenges/${challengeId}`),
};

export const adminChallengesApi = {
    list: () => api.get('/challenges'),
};

export default api;
