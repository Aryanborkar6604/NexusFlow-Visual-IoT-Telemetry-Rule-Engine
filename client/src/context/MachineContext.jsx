import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSocket } from './SocketContext.jsx';
import { telemetryService } from '../services/telemetryService.js';
import { alertService } from '../services/alertService.js';
import { playAlertBeep, playConfirmBeep } from '../utils/alertSound.js';

const MachineContext = createContext(null);

export function MachineProvider({ children }) {
  const { socket, isConnected } = useSocket();
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('TURBINE_001');
  const [capacity, setCapacity] = useState({
    activeCount: 0,
    maxCapacity: 4,
    availableSlots: 4,
    loadPercent: 0,
    status: 'idle',
  });
  const [capacityError, setCapacityError] = useState(null);
  const [togglingMap, setTogglingMap] = useState({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuPinned, setIsMenuPinned] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [isAlertRinging, setIsAlertRinging] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('nexusflow_alert_sound') !== 'false';
  });
  const soundEnabledRef = useRef(soundEnabled);
  const ringTimerRef = useRef(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexusflow_alert_sound', String(soundEnabled));
    }
  }, [soundEnabled]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notifyToast = useCallback(({ title, message, type = 'info' }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  const toggleSound = useCallback(async () => {
    const next = !soundEnabledRef.current;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    if (next) {
      await playConfirmBeep();
    }
    notifyToast({
      title: next ? 'Alert Beep Sound Enabled' : 'Alert Beep Muted',
      message: next
        ? 'Audible beep will sound whenever an anomaly alert triggers.'
        : 'Visual alerts continue silently without audio.',
      type: next ? 'success' : 'info',
    });
  }, [notifyToast]);

  const loadDevices = useCallback(async () => {
    try {
      const { devices: devList, capacity: cap } = await telemetryService.getDevicesWithCapacity();
      setDevices(devList);
      if (cap) setCapacity(cap);
    } catch (err) {
      console.warn('[MachineContext] Failed to load devices:', err.message);
    }
  }, []);

  const refreshAlerts = useCallback(async (limit = 100) => {
    setAlertsLoading(true);
    try {
      const list = await alertService.getAlerts(limit);
      setAlerts(list);
    } catch (err) {
      console.warn('[MachineContext] Failed to fetch alerts:', err.message);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // Load initial devices & alerts, refreshing on socket reconnect
  useEffect(() => {
    loadDevices();
    refreshAlerts(100);
  }, [loadDevices, refreshAlerts, isConnected]);

  // Listen to real-time Socket.IO telemetry, device status, and alerts (single centralized subscription)
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
    };

    const handleCapacityUpdate = (cap) => {
      if (cap) setCapacity(cap);
    };

    const handleNewAlert = (newAlert) => {
      if (!newAlert) return;
      const alertKey = newAlert.id || newAlert._id;

      setAlerts((prev) => {
        if (alertKey && prev.some((a) => (a.id || a._id) === alertKey)) {
          return prev;
        }
        return [newAlert, ...prev].slice(0, 200);
      });

      setIsAlertRinging(true);
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = setTimeout(() => setIsAlertRinging(false), 1200);

      if (soundEnabledRef.current) {
        playAlertBeep();
      }
    };

    socket.on('telemetry:update', handleUpdate);
    socket.on('device:status', handleDeviceStatus);
    socket.on('capacity:update', handleCapacityUpdate);
    socket.on('alert:new', handleNewAlert);

    return () => {
      socket.off('telemetry:update', handleUpdate);
      socket.off('device:status', handleDeviceStatus);
      socket.off('capacity:update', handleCapacityUpdate);
      socket.off('alert:new', handleNewAlert);
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    };
  }, [socket]);

  const togglePower = useCallback(async (deviceId) => {
    setCapacityError(null);
    setTogglingMap((prev) => ({ ...prev, [deviceId]: true }));
    try {
      const res = await telemetryService.toggleDevice(deviceId);
      if (res.device) {
        setDevices((prev) =>
          prev.map((d) => (d.deviceId === deviceId ? res.device : d))
        );
        if (res.device.powered) {
          setSelectedDeviceId(deviceId);
        }
        notifyToast({
          title: `${res.device.name} ${res.device.powered ? 'Started' : 'Stopped'}`,
          message: res.device.powered
            ? 'Operational telemetry streaming live at 1Hz.'
            : 'Unit cooled down safely to standby mode.',
          type: res.device.powered ? 'success' : 'info',
        });
      }
      if (res.capacity) {
        setCapacity(res.capacity);
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to toggle machine power.';
      setCapacityError(msg);
      notifyToast({ title: 'Power Switch Error', message: msg, type: 'error' });
      if (err.response?.data?.capacity) {
        setCapacity(err.response.data.capacity);
      }
      setTimeout(() => setCapacityError(null), 5000);
      throw err;
    } finally {
      setTogglingMap((prev) => {
        const next = { ...prev };
        delete next[deviceId];
        return next;
      });
    }
  }, [notifyToast]);

  const bulkTogglePower = useCallback(async (action) => {
    setCapacityError(null);
    setTogglingMap((prev) => ({ ...prev, __bulk__: true }));
    try {
      const res = await telemetryService.bulkToggle(action);
      if (res.devices) {
        setDevices(res.devices);
      }
      if (res.capacity) {
        setCapacity(res.capacity);
      }
      notifyToast({
        title: action === 'start_all' ? 'All Machines Started' : 'Emergency Standby Complete',
        message: res.message || 'Fleet power states updated.',
        type: action === 'start_all' ? 'success' : 'info',
      });
      return res;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Bulk power operation failed.';
      setCapacityError(msg);
      notifyToast({ title: 'Bulk Power Error', message: msg, type: 'error' });
      setTimeout(() => setCapacityError(null), 5000);
      throw err;
    } finally {
      setTogglingMap((prev) => {
        const next = { ...prev };
        delete next.__bulk__;
        return next;
      });
    }
  }, [notifyToast]);

  const runningDevices = useMemo(
    () => devices.filter((d) => d.status === 'online'),
    [devices]
  );

  const standbyDevices = useMemo(
    () => devices.filter((d) => d.status !== 'online'),
    [devices]
  );

  const fleetStats = useMemo(() => {
    if (runningDevices.length === 0) {
      return {
        avgTemp: 0,
        avgPressure: 0,
        avgHumidity: 0,
        hottestDevice: null,
        activeCount: 0,
        standbyCount: devices.length,
        hasOverheat: false,
      };
    }

    let sumT = 0;
    let sumP = 0;
    let sumH = 0;
    let maxT = -Infinity;
    let hottest = null;

    runningDevices.forEach((d) => {
      const r = d.lastReading || {};
      const t = Number(r.temperature || 0);
      const p = Number(r.pressure || 0);
      const h = Number(r.humidity || 0);

      sumT += t;
      sumP += p;
      sumH += h;

      if (t > maxT) {
        maxT = t;
        hottest = { deviceId: d.deviceId, name: d.name, temp: t };
      }
    });

    return {
      avgTemp: Math.round((sumT / runningDevices.length) * 10) / 10,
      avgPressure: Math.round(sumP / runningDevices.length),
      avgHumidity: Math.round(sumH / runningDevices.length),
      hottestDevice: hottest,
      activeCount: runningDevices.length,
      standbyCount: devices.length - runningDevices.length,
      hasOverheat: maxT > 80,
    };
  }, [runningDevices, devices.length]);

  const toggleMenu = useCallback(() => setIsMenuOpen((prev) => !prev), []);
  const openMenu = useCallback(() => setIsMenuOpen(true), []);
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    setIsMenuPinned(false);
  }, []);
  const toggleMenuPin = useCallback(() => setIsMenuPinned((prev) => !prev), []);

  const value = {
    devices,
    runningDevices,
    standbyDevices,
    capacity,
    fleetStats,
    capacityError,
    clearCapacityError: () => setCapacityError(null),
    selectedDeviceId,
    setSelectedDeviceId,
    togglingMap,
    isConnected,
    togglePower,
    bulkTogglePower,
    isMenuOpen,
    setIsMenuOpen,
    toggleMenu,
    openMenu,
    closeMenu,
    isMenuPinned,
    setIsMenuPinned,
    toggleMenuPin,
    toasts,
    notifyToast,
    dismissToast,
    alerts,
    alertsLoading,
    refreshAlerts,
    soundEnabled,
    toggleSound,
    isAlertRinging,
  };

  return <MachineContext.Provider value={value}>{children}</MachineContext.Provider>;
}

export function useMachines() {
  const ctx = useContext(MachineContext);
  if (!ctx) {
    throw new Error('useMachines must be used within a MachineProvider');
  }
  return ctx;
}
