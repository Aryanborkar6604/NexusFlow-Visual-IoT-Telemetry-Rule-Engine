import { apiClient } from './apiClient.js';

export const telemetryService = {
  async getDevices() {
    const res = await apiClient.get('/devices');
    return res.data.devices || [];
  },

  async getHistory(deviceId, limit = 60) {
    const res = await apiClient.get('/telemetry/history', {
      params: { deviceId, limit },
    });
    return res.data.readings || [];
  },

  async postTelemetry(reading) {
    const res = await apiClient.post('/telemetry', reading);
    return res.data;
  },
};
