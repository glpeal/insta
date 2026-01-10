import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Instagram API
export const instagramApi = {
  login: (username, password) =>
    api.post('/instagram/login', { username, password }),

  restoreSession: (username) =>
    api.post('/instagram/restore-session', { username }),

  checkSession: () =>
    api.get('/instagram/check-session'),

  logout: () =>
    api.post('/instagram/logout'),

  sendTestDm: (username, message) =>
    api.post('/instagram/send-test-dm', { username, message })
};

// Settings API
export const settingsApi = {
  get: () =>
    api.get('/settings'),

  update: (settings) =>
    api.put('/settings', settings)
};

// Logs API
export const logsApi = {
  getDmLogs: (limit = 100) =>
    api.get('/logs/dm', { params: { limit } }),

  getSystemLogs: (limit = 100) =>
    api.get('/logs/system', { params: { limit } }),

  getTrackedComments: () =>
    api.get('/logs/comments')
};

// Status API
export const statusApi = {
  get: () =>
    api.get('/status'),

  health: () =>
    api.get('/health')
};

export default api;
