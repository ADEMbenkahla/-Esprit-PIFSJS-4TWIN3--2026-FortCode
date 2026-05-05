import axios from 'axios';
import { API_BASE_URL } from '../config';

const getToken = () => {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
};

const trainingApi = {
  // Get all training exercises (using stages endpoint temporarily)
  getAll: async () => {
    const token = getToken();
    const response = await axios.get(`${API_BASE_URL}/stages`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response;
  },

  // Get a specific training exercise (using stages endpoint temporarily)
  get: async (trainingId) => {
    const token = getToken();
    const response = await axios.get(`${API_BASE_URL}/stages/${trainingId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response;
  },

  // Run tests for a training exercise (using stages endpoint temporarily)
  run: async (trainingId, code, language = 'javascript') => {
    const token = getToken();
    const response = await axios.post(`${API_BASE_URL}/stages/${trainingId}/run`, {
      code,
      language
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response;
  },

  // Submit solution for a training exercise (using stages endpoint temporarily)
  submit: async (trainingId, code, language = 'javascript') => {
    const token = getToken();
    const response = await axios.post(`${API_BASE_URL}/stages/${trainingId}/submit`, {
      code,
      language
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response;
  },

  // Get AI explanation for training exercise (using stages endpoint temporarily)
  explain: async (code, language, level, trainingId) => {
    const token = getToken();
    const response = await axios.post(`${API_BASE_URL}/stages/${trainingId}/explain`, {
      code,
      language,
      level
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response;
  },

  // Reset a training exercise (using stages endpoint temporarily)
  reset: async (trainingId) => {
    const token = getToken();
    const response = await axios.post(`${API_BASE_URL}/stages/${trainingId}/reset`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response;
  }
};

export default trainingApi;
