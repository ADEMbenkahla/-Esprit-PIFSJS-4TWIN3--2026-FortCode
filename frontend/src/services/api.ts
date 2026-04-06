import axios from 'axios';

type ApiPayload = Record<string, unknown>;
type ApiParams = Record<string, string | number | boolean | undefined>;

// Create axios instance with base URL
const api = axios.create({
    baseURL: 'http://localhost:5000/api',
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
        const hasToken = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (hasToken && error.response && (error.response.status === 401 || error.response.status === 403)) {
            sessionStorage.removeItem('token');
            localStorage.removeItem('token');
            window.location.href = '/'; // Redirect to login
        }

        return Promise.reject(error);
    }
);

export const getBattleInvitationPreview = (token: string) => {
    return api.get('/battle-rooms/battle-invitations/preview', {
        params: { token }
    });
};

export const acceptBattleInvitation = (payload: ApiPayload) => {
    return api.post('/battle-rooms/battle-invitations/accept', payload);
};

export const requestVirtualRoom = (payload: ApiPayload) => {
    return api.post('/virtual-room/recruiter/virtual-room/request', payload);
};

export const getMyVirtualRoomRequest = () => {
    return api.get('/virtual-room/recruiter/virtual-room/request');
};

export const deleteMyAccount = (payload: ApiPayload) => {
    return api.delete('/auth/profile', { data: payload });
};

export const getParticipants = () => {
    return api.get('/battle-rooms/recruiter/participants');
};

export const generateBattleExercise = (payload: ApiPayload) => {
    return api.post('/battle-rooms/recruiter/battle-rooms/generate-exercise', payload);
};

export const createBattleRoom = (payload: ApiPayload) => {
    const form = new FormData();

    const title = String(payload.title || '').trim();
    const description = String(payload.description || '');
    const timeLimitMinutes = Number(payload.timeLimitMinutes || 60);
    const participantIds = Array.isArray(payload.participantIds) ? payload.participantIds : [];
    const inviteEmails = Array.isArray(payload.inviteEmails) ? payload.inviteEmails : [];
    const challenge = payload.challenge && typeof payload.challenge === 'object' ? payload.challenge : {};
    const exerciseFile = payload.exerciseFile instanceof File ? payload.exerciseFile : null;

    form.append('title', title);
    form.append('description', description);
    form.append('timeLimitMinutes', String(timeLimitMinutes));
    form.append('participantIds', JSON.stringify(participantIds));
    form.append('inviteEmails', JSON.stringify(inviteEmails));
    form.append('challenge', JSON.stringify(challenge));

    if (exerciseFile) {
        form.append('exerciseFile', exerciseFile);
    }

    return api.post('/battle-rooms/recruiter/battle-rooms', form);
};

export const getMyBattleRooms = () => {
    return api.get('/battle-rooms/recruiter/battle-rooms');
};

export const getBattleRoom = (id: string) => {
    return api.get(`/battle-rooms/recruiter/battle-rooms/${id}`);
};

export const updateBattleRoomStatus = (id: string, payload: ApiPayload | string) => {
    const body = typeof payload === 'string' ? { status: payload } : payload;
    return api.patch(`/battle-rooms/recruiter/battle-rooms/${id}`, body);
};

export const updateSubmissionEvaluation = (roomId: string, submissionId: string, payload: ApiPayload) => {
    return api.patch(`/battle-rooms/recruiter/battle-rooms/${roomId}/submissions/${submissionId}`, payload);
};

export const getParticipantBattleRoomAccess = (roomId: string) => {
    return api.get(`/battle-rooms/participant/battle-rooms/${roomId}/access`);
};

export const getParticipantBattleRooms = () => {
    return api.get('/battle-rooms/participant/battle-rooms');
};

export const reportParticipantBattleFraud = (roomId: string, reason: string) => {
    return api.post(`/battle-rooms/participant/battle-rooms/${roomId}/fraud`, { reason });
};

export const submitParticipantBattleCode = (roomId: string, code: string) => {
    return api.post(`/battle-rooms/participant/battle-rooms/${roomId}/submit`, { code });
};

export const stagesApi = {
    me: (params: ApiParams = {}) => api.get('/stages/me', { params }),
    get: (id: string) => api.get(`/stages/${id}`),
    run: (stageId: string, challengeId: string, code: string) => api.post(`/stages/${stageId}/challenges/${challengeId}/run`, { code }),
    submit: (stageId: string, challengeId: string, code: string) => api.post(`/stages/${stageId}/challenges/${challengeId}/submit`, { code }),
    complete: (stageId: string, challengeId: string) => api.post(`/stages/${stageId}/challenges/${challengeId}/complete`),
    reset: (stageId: string) => api.post(`/stages/${stageId}/reset`),
};

export const adminStagesApi = {
    list: () => api.get('/stages'),
    create: (payload: ApiPayload) => api.post('/stages', payload),
    update: (id: string, payload: ApiPayload) => api.put(`/stages/${id}`, payload),
    remove: (id: string) => api.delete(`/stages/${id}`),
    assignChallenges: (id: string, challengeIds: string[]) => api.post(`/stages/${id}/challenges`, { challengeIds }),
};

export const adminChallengesApi = {
    list: () => api.get('/challenges'),
    create: (payload: ApiPayload) => api.post('/challenges', payload),
    update: (id: string, payload: ApiPayload) => api.put(`/challenges/${id}`, payload),
    remove: (id: string) => api.delete(`/challenges/${id}`),
};

export default api;
