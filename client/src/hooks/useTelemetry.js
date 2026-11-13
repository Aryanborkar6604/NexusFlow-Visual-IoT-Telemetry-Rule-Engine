import { useState, useEffect } from 'react';
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

  // Listen for real-time live Socket.IO readings
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (reading) => {
      // Update device list latest state
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === reading.deviceId
            ? { ...d, lastReading: reading, status: 'online' }
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

    socket.on('telemetry:update', handleUpdate);

    return () => {
      socket.off('telemetry:update', handleUpdate);
    };
  }, [socket, targetDeviceId, maxDataPoints]);

  return {
    dataPoints,
    currentReading,
    devices,
    isConnected,
  };
}
