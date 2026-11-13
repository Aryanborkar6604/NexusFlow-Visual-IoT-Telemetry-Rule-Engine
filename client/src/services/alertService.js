import { apiClient } from './apiClient.js';

export const alertService = {
  async getAlerts(limit = 50) {
    const res = await apiClient.get('/alerts', { params: { limit } });
    return res.data.alerts || [];
  },

  async triggerTestSpike(deviceId = 'TURBINE_001', temperature = 92) {
    const res = await apiClient.post('/alerts/test-spike', { deviceId, temperature });
    return res.data;
  },
};
