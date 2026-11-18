import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { telemetryService } from '../services/telemetryService.js';

export function useTelemetry(targetDeviceId = 'TURBINE_001', maxDataPoints = 30) {
  const { socket, isConnected } = useSocket();
  const [dataPoints, setDataPoints] = useState([]);
  const [currentReading, setCurrentReading] = useState(null);
  const [devices, setDevices] = useState([]);
  const [capacity, setCapacity] = useState({
    activeCount: 0,
    maxCapacity: 4,
    availableSlots: 4,
    loadPercent: 0,
    status: 'idle',
  });
  const [capacityError, setCapacityError] = useState(null);

  // Load initial devices, capacity & history
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [{ devices: devList, capacity: cap }, history] = await Promise.all([
          telemetryService.getDevicesWithCapacity(),
          telemetryService.getHistory(targetDeviceId, maxDataPoints),
        ]);
        if (!isMounted) return;
        setDevices(devList);
        if (cap) setCapacity(cap);

        if (history.length > 0) {
          setDataPoints(history);
          setCurrentReading(history[history.length - 1]);
        } else {
          const targetDev = devList.find((d) => d.deviceId === targetDeviceId);
          setDataPoints([]);
          setCurrentReading(targetDev?.lastReading || null);
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

      if (payload.capacity) {
        setCapacity(payload.capacity);
      }

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

  // Toggle machine power ON / OFF (respecting 4-machine server capacity limit)
  const togglePower = useCallback(async (deviceId) => {
    setCapacityError(null);
    try {
      const res = await telemetryService.toggleDevice(deviceId);
      if (res.device) {
        setDevices((prev) =>
          prev.map((d) => (d.deviceId === deviceId ? res.device : d))
        );
      }
      if (res.capacity) {
        setCapacity(res.capacity);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to toggle machine power.';
      setCapacityError(msg);
      if (err.response?.data?.capacity) {
        setCapacity(err.response.data.capacity);
      }
      setTimeout(() => setCapacityError(null), 5000);
    }
  }, []);

  const runningDevices = useMemo(
    () => devices.filter((d) => d.status === 'online'),
    [devices]
  );

  return {
    dataPoints,
    currentReading,
    devices,
    runningDevices,
    capacity,
    capacityError,
    clearCapacityError: () => setCapacityError(null),
    isConnected,
    togglePower,
  };
}
