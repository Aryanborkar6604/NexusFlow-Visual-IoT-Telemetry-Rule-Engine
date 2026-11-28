
import { apiClient } from './apiClient.js';

export const authService = {
  async login(email, password) {
    try {
      const res = await apiClient.post('/auth/login', {
        email,
        password,
      });

      return res.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Login failed. Please try again.';

      throw new Error(message);
    }
  },

  getCurrentUser() {
    try {
      const saved = localStorage.getItem('nexusflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error reading saved user:', error);
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('nexusflow_token');
  },

  logout() {
    localStorage.removeItem('nexusflow_token');
    localStorage.removeItem('nexusflow_user');
  },
};
