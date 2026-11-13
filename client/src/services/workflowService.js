import { apiClient } from './apiClient.js';

export const workflowService = {
  async getWorkflows() {
    const res = await apiClient.get('/workflows');
    return res.data.workflows || [];
  },

  async getWorkflow(id) {
    const res = await apiClient.get(`/workflows/${id}`);
    return res.data;
  },

  async saveWorkflow(workflow) {
    const res = await apiClient.post('/workflows', workflow);
    return res.data;
  },

  async toggleWorkflow(id) {
    const res = await apiClient.post(`/workflows/${id}/toggle`);
    return res.data;
  },

  async deleteWorkflow(id) {
    const res = await apiClient.delete(`/workflows/${id}`);
    return res.data;
  },
};
