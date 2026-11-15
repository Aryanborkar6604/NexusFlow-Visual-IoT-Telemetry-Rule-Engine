import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { telemetryService } from '../services/telemetryService.js';

export function useTelemetry(targetDeviceId = 'TURBINE_001', maxDataPoints = 30) {
  const { socket, isConnected } = useSocket();
  const [dataPoints, setDataPoints] = useState([]);
  const [currentReading, setCurrentReading] = useState(null);
  const [devices, setDevices] = useState([]);

  // Load initial devices & history
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [devList, history] = await Promise.all([
          telemetryService.getDevices(),
          telemetryService.getHistory(targetDeviceId, maxDataPoints),
        ]);
        if (!isMounted) return;
        setDevices(devList);
        if (history.length > 0) {
          setDataPoints(history);
          setCurrentReading(history[history.length - 1]);
        }
      } catch (err) {
        console.warn('[useTelemetry] Failed to load initial data:', err.message);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [targetDeviceId, maxDataPoints]);

  // Listen for real-time live Socket.IO readings and power status
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (reading) => {
      // Update device list latest state
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === reading.deviceId
            ? {
                ...d,
                lastReading: reading,
                status: reading.status !== undefined ? reading.status : d.status,
                powered: reading.status !== 'offline',
              }
            : d
        )
      );

      if (reading.deviceId === targetDeviceId) {
        setCurrentReading(reading);
        setDataPoints((prev) => {
          const next = [...prev, reading];
          return next.length > maxDataPoints ? next.slice(next.length - maxDataPoints) : next;
        });
      }
    };

    const handleDeviceStatus = (payload) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === payload.deviceId
            ? {
                ...d,
                status: payload.status,
                powered: payload.powered,
                lastReading: payload.lastReading || d.lastReading,
              }
            : d
        )
      );

      if (payload.deviceId === targetDeviceId && payload.lastReading) {
        setCurrentReading(payload.lastReading);
      }
    };

    socket.on('telemetry:update', handleUpdate);
    socket.on('device:status', handleDeviceStatus);

    return () => {
      socket.off('telemetry:update', handleUpdate);
      socket.off('device:status', handleDeviceStatus);
    };
  }, [socket, targetDeviceId, maxDataPoints]);

  // Toggle machine power ON / OFF
  const togglePower = useCallback(async (deviceId) => {
    try {
      // Optimistic UI update
      setDevices((prev) =>
        prev.map((d) => {
          if (d.deviceId === deviceId) {
            const nextStatus = d.status === 'online' ? 'offline' : 'online';
            return {
              ...d,
              status: nextStatus,
              powered: nextStatus === 'online',
            };
          }
          return d;
        })
      );
      await telemetryService.toggleDevice(deviceId);
    } catch (err) {
      console.error(`Failed to toggle device ${deviceId}:`, err);
    }
  }, []);

  return {
    dataPoints,
    currentReading,
    devices,
    isConnected,
    togglePower,
  };
}
