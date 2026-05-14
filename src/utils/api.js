import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({ baseURL: API_BASE });

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('hr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hr_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const login = (username, password) => api.post('/api/auth/login', { username, password });
export const getRaces = (date) => api.get('/api/races', { params: date ? { date } : {} });
export const getRaceDetail = (raceId) => api.get(`/api/races/${raceId}`);
export const triggerAnalysis = (raceId) => api.post(`/api/races/${raceId}/analyse`);
export const horseDeepDive = (raceId, horseName) => api.post(`/api/races/${raceId}/horse/${encodeURIComponent(horseName)}/deepdive`);
export const getStats = () => api.get('/api/races/admin/stats');
export const triggerRefresh = () => api.post('/api/races/admin/refresh');

export default api;
