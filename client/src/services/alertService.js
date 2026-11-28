
import { apiClient } from './apiClient.js';

export const alertService = {
  // Fetch alerts from backend
  async getAlerts(limit = 50) {
    try {
      const res = await apiClient.get('/alerts', {
        params: { limit },
      });

      return Array.isArray(res.data?.alerts)
        ? res.data.alerts
        : [];
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch alerts';

      throw new Error(message);
    }
  },

  // Trigger a test temperature spike
  async triggerTestSpike(
    deviceId = 'TURBINE_001',
    temperature = 92
  ) {
    try {
      const res = await apiClient.post('/alerts/test-spike', {
        deviceId,
        temperature,
      });

      return res.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to trigger test alert';

      throw new Error(message);
    }
  },
};
