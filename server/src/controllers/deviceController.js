// Server capacity tuned for optimal nominal load of 3-4 concurrent running machines (scalable up to all 7)
export const NOMINAL_ACTIVE_MACHINES = 4;
export const MAX_ACTIVE_MACHINES = 7;

// Operational baseline sensor profiles for each machine when running
const MACHINE_OPERATIONAL_PROFILES = {
  TURBINE_001: { temperature: 72.4, pressure: 118, humidity: 42 },
  PUMP_002: { temperature: 55.1, pressure: 95, humidity: 36 },
  BOILER_003: { temperature: 92.8, pressure: 140, humidity: 64 },
  CONVEYOR_004: { temperature: 38.5, pressure: 22, humidity: 53 },
  ROBOT_005: { temperature: 52.3, pressure: 168, humidity: 39 },
  COMPRESSOR_006: { temperature: 80.6, pressure: 130, humidity: 33 },
  GENERATOR_007: { temperature: 67.2, pressure: 112, humidity: 47 },
};

// Registry of factory devices with attached sensors & power states
// Default boot state: 3 machines RUNNING (optimal 75% load), remaining in standby
const devices = [
  {
    deviceId: 'TURBINE_001',
    name: 'Main Turbine Unit #1',
    type: 'Turbine',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'online',
    powered: true,
    lastReading: { temperature: 72.4, pressure: 118, humidity: 42, status: 'online', timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'PUMP_002',
    name: 'Coolant Pump #2',
    type: 'Pump',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'online',
    powered: true,
    lastReading: { temperature: 55.1, pressure: 95, humidity: 36, status: 'online', timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'BOILER_003',
    name: 'Industrial Steam Boiler',
    type: 'Boiler',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'online',
    powered: true,
    lastReading: { temperature: 92.8, pressure: 140, humidity: 64, status: 'online', timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'CONVEYOR_004',
    name: 'Assembly Line Conveyor',
    type: 'Conveyor',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'offline',
    powered: false,
    lastReading: { temperature: 24.0, pressure: 0, humidity: 50, status: 'offline', timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'ROBOT_005',
    name: '6-Axis Robotic Arm #5',
    type: 'Robotic Arm',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'offline',
    powered: false,
    lastReading: { temperature: 24.0, pressure: 0, humidity: 42, status: 'offline', timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'COMPRESSOR_006',
    name: 'Rotary Air Compressor #6',
    type: 'Compressor',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'offline',
    powered: false,
    lastReading: { temperature: 24.0, pressure: 0, humidity: 38, status: 'offline', timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'GENERATOR_007',
    name: 'Diesel Backup Generator #7',
    type: 'Generator',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'offline',
    powered: false,
    lastReading: { temperature: 24.0, pressure: 0, humidity: 46, status: 'offline', timestamp: new Date().toISOString() },
  },
];

let socketServerRef = null;

export function setDeviceSocketServer(server) {
  socketServerRef = server;
}

export function getServerCapacity() {
  const activeCount = devices.filter((d) => d.status === 'online').length;
  const loadPercent = Math.round((activeCount / NOMINAL_ACTIVE_MACHINES) * 100);
  let capacityStatus = 'optimal';
  if (activeCount === 0) capacityStatus = 'idle';
  else if (activeCount === NOMINAL_ACTIVE_MACHINES) capacityStatus = 'full_load';
  else if (activeCount > NOMINAL_ACTIVE_MACHINES) capacityStatus = 'high_load';

  return {
    activeCount,
    nominalCapacity: NOMINAL_ACTIVE_MACHINES,
    maxCapacity: NOMINAL_ACTIVE_MACHINES,
    totalMachines: devices.length,
    availableSlots: Math.max(0, NOMINAL_ACTIVE_MACHINES - activeCount),
    loadPercent,
    status: capacityStatus,
  };
}

export function getDevices(req, res) {
  res.json({
    devices,
    capacity: getServerCapacity(),
  });
}

/**
 * Returns ONLY the machines that are currently RUNNING along with their live readings
 */
export function getRunningDevices(req, res) {
  const running = devices
    .filter((d) => d.status === 'online')
    .map((d) => ({
      deviceId: d.deviceId,
      name: d.name,
      type: d.type,
      status: d.status,
      reading: d.lastReading,
    }));

  res.json({
    runningCount: running.length,
    capacity: getServerCapacity(),
    machines: running,
  });
}

export function isDeviceOnline(deviceId) {
  const dev = devices.find((d) => d.deviceId === deviceId);
  return dev ? dev.status === 'online' : false;
}

export function updateDeviceReading(reading) {
  const dev = devices.find((d) => d.deviceId === reading.deviceId);
  if (dev && dev.status === 'online') {
    dev.lastReading = {
      ...dev.lastReading,
      ...reading,
      status: 'online',
      timestamp: new Date().toISOString(),
    };
  }
}

export function toggleDevice(req, res) {
  const { id } = req.params;
  const dev = devices.find((d) => d.deviceId === id);

  if (!dev) {
    return res.status(404).json({ error: `Device ${id} not found.` });
  }

  const isCurrentlyOnline = dev.status === 'online';

  dev.status = isCurrentlyOnline ? 'offline' : 'online';
  dev.powered = dev.status === 'online';

  if (!dev.powered) {
    // Powered OFF: cool down to ambient standby
    dev.lastReading = {
      ...dev.lastReading,
      temperature: 24.0,
      pressure: 0,
      humidity: dev.lastReading?.humidity || 50,
      status: 'offline',
      timestamp: new Date().toISOString(),
    };
  } else {
    // Powered ON: initialize realistic operational sensor readings immediately
    const profile = MACHINE_OPERATIONAL_PROFILES[dev.deviceId] || {
      temperature: 60.0,
      pressure: 100,
      humidity: 45,
    };
    dev.lastReading = {
      ...dev.lastReading,
      temperature: profile.temperature,
      pressure: profile.pressure,
      humidity: profile.humidity,
      status: 'online',
      timestamp: new Date().toISOString(),
    };
  }

  const capacity = getServerCapacity();

  // Broadcast device status + updated capacity to all connected clients via Socket.IO
  if (socketServerRef) {
    socketServerRef.emitToFactory('FACTORY_01', 'device:status', {
      deviceId: dev.deviceId,
      status: dev.status,
      powered: dev.powered,
      lastReading: dev.lastReading,
      capacity,
    });
    socketServerRef.emitToFactory('FACTORY_01', 'telemetry:update', {
      deviceId: dev.deviceId,
      factoryId: 'FACTORY_01',
      ...dev.lastReading,
    });
  }

  const statusLabel = dev.powered ? 'RUNNING' : 'STOPPED';
  res.json({
    message: `Machine ${dev.name} (${dev.deviceId}) is now ${statusLabel}.`,
    device: dev,
    capacity,
  });
}
