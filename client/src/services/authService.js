import { apiClient } from './apiClient.js';

export const authService = {
  async login(email, password) {
    const res = await apiClient.post('/auth/login', { email, password });
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
