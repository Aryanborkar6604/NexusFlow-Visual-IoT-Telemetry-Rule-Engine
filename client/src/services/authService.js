import { apiClient } from './apiClient.js';

export const authService = {
  async login(email, password) {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },

  async register({ name, email, password, role, factoryId }) {
    const res = await apiClient.post('/auth/register', { name, email, password, role, factoryId });
    return res.data;
  },

  getCurrentUser() {
    const saved = localStorage.getItem('nexusflow_user');
    return saved ? JSON.parse(saved) : null;
  },

  getToken() {
    return localStorage.getItem('nexusflow_token');
  },

  logout() {
    localStorage.removeItem('nexusflow_token');
    localStorage.removeItem('nexusflow_user');
  },
};
