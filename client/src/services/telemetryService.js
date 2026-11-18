import { apiClient } from './apiClient.js';

export const telemetryService = {
  async getDevices() {
    const res = await apiClient.get('/devices');
    return res.data.devices || [];
  },

  async getDevicesWithCapacity() {
    const res = await apiClient.get('/devices');
    return {
      devices: res.data.devices || [],
      capacity: res.data.capacity || { activeCount: 0, maxCapacity: 4, loadPercent: 0, status: 'idle' },
    };
  },

  async getRunningDevices() {
    const res = await apiClient.get('/devices/running');
    return res.data;
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

  async toggleDevice(deviceId) {
    const res = await apiClient.post(`/devices/${deviceId}/toggle`);
    return res.data;
  },
};
