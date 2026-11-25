import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { useMachines } from '../context/MachineContext.jsx';
import { telemetryService } from '../services/telemetryService.js';

export function useTelemetry(targetDeviceId = 'TURBINE_001', maxDataPoints = 30) {
  const { socket } = useSocket();
  const {
    devices,
    runningDevices,
    standbyDevices,
    capacity,
    fleetStats,
    capacityError,
    clearCapacityError,
    isConnected,
    togglePower: contextTogglePower,
    bulkTogglePower: contextBulkTogglePower,
  } = useMachines();

  const [dataPoints, setDataPoints] = useState([]);
  const [currentReading, setCurrentReading] = useState(null);

  // Load rolling chart history whenever target device changes
  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      try {
        const history = await telemetryService.getHistory(targetDeviceId, maxDataPoints);
        if (!isMounted) return;

        if (history.length > 0) {
          setDataPoints(history);
          setCurrentReading(history[history.length - 1]);
        } else {
          setDataPoints([]);
          setCurrentReading(null);
        }
      } catch (err) {
        console.warn('[useTelemetry] Failed to load device history:', err.message);
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [targetDeviceId, maxDataPoints]);

  // Seed initial reading from shared device registry if history was empty
  useEffect(() => {
    if (currentReading) return;
    const targetDev = devices.find((d) => d.deviceId === targetDeviceId);
    if (targetDev?.lastReading) {
      setCurrentReading(targetDev.lastReading);
    }
  }, [devices, targetDeviceId, currentReading]);

  // Append live Socket.IO readings to the focused chart window
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (reading) => {
      if (reading.deviceId === targetDeviceId) {
        setCurrentReading(reading);
        setDataPoints((prev) => {
          const next = [...prev, reading];
          return next.length > maxDataPoints ? next.slice(next.length - maxDataPoints) : next;
        });
      }
    };

    const handleDeviceStatus = (payload) => {
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

  const togglePower = useCallback(
    async (deviceId) => {
      const res = await contextTogglePower(deviceId);
      if (deviceId === targetDeviceId && res?.device?.lastReading) {
        setCurrentReading(res.device.lastReading);
        setDataPoints((prev) => {
          const next = [...prev, res.device.lastReading];
          return next.length > maxDataPoints ? next.slice(next.length - maxDataPoints) : next;
        });
      }
      return res;
    },
    [contextTogglePower, targetDeviceId, maxDataPoints]
  );

  const bulkTogglePower = useCallback(
    async (action) => {
      const res = await contextBulkTogglePower(action);
      const targetDev = res?.devices?.find((d) => d.deviceId === targetDeviceId);
      if (targetDev?.lastReading) {
        setCurrentReading(targetDev.lastReading);
        setDataPoints((prev) => {
          const next = [...prev, targetDev.lastReading];
          return next.length > maxDataPoints ? next.slice(next.length - maxDataPoints) : next;
        });
      }
      return res;
    },
    [contextBulkTogglePower, targetDeviceId, maxDataPoints]
  );

  return {
    dataPoints,
    currentReading,
    devices,
    runningDevices,
    standbyDevices,
    capacity,
    fleetStats,
    capacityError,
    clearCapacityError,
    isConnected,
    togglePower,
    bulkTogglePower,
  };
}
