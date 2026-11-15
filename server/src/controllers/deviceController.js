// Registry of factory devices with attached sensors & power states
const devices = [
  {
    deviceId: 'TURBINE_001',
    name: 'Main Turbine Unit #1',
    type: 'Turbine',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'online',
    powered: true,
    lastReading: { temperature: 72.4, pressure: 118, humidity: 42, timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'PUMP_002',
    name: 'Coolant Pump #2',
    type: 'Pump',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'online',
    powered: true,
    lastReading: { temperature: 55.1, pressure: 95, humidity: 36, timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'BOILER_003',
    name: 'Industrial Steam Boiler',
    type: 'Boiler',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'online',
    powered: true,
    lastReading: { temperature: 94.8, pressure: 140, humidity: 64, timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'CONVEYOR_004',
    name: 'Assembly Line Conveyor',
    type: 'Conveyor',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'online',
    powered: true,
    lastReading: { temperature: 38.2, pressure: 22, humidity: 55, timestamp: new Date().toISOString() },
  },
  // 3 New Connected Machines with Sensors:
  {
    deviceId: 'ROBOT_005',
    name: '6-Axis Robotic Arm #5',
    type: 'Robotic Arm',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'online',
    powered: true,
    lastReading: { temperature: 52.6, pressure: 172, humidity: 38, timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'COMPRESSOR_006',
    name: 'Rotary Air Compressor #6',
    type: 'Compressor',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'online',
    powered: true,
    lastReading: { temperature: 81.3, pressure: 132, humidity: 33, timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'GENERATOR_007',
    name: 'Diesel Backup Generator #7',
    type: 'Generator',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'online',
    powered: true,
    lastReading: { temperature: 67.9, pressure: 112, humidity: 48, timestamp: new Date().toISOString() },
  },
];

let socketServerRef = null;

export function setDeviceSocketServer(server) {
  socketServerRef = server;
}

export function getDevices(req, res) {
  res.json({ devices });
}

export function isDeviceOnline(deviceId) {
  const dev = devices.find((d) => d.deviceId === deviceId);
  return dev ? dev.status === 'online' : true;
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
    // If powered OFF, cool down to ambient standby
    dev.lastReading = {
      ...dev.lastReading,
      temperature: 24.0,
      pressure: 0,
      status: 'offline',
      timestamp: new Date().toISOString(),
    };
  }

  // Broadcast device status update to all connected frontend clients via Socket.IO
  if (socketServerRef) {
    socketServerRef.emitToFactory('FACTORY_01', 'device:status', {
      deviceId: dev.deviceId,
      status: dev.status,
      powered: dev.powered,
      lastReading: dev.lastReading,
    });
    // Also broadcast updated telemetry
    socketServerRef.emitToFactory('FACTORY_01', 'telemetry:update', {
      deviceId: dev.deviceId,
      factoryId: 'FACTORY_01',
      ...dev.lastReading,
    });
  }

  res.json({
    message: `Machine ${dev.name} (${dev.deviceId}) is now ${dev.status.toUpperCase()}.`,
    device: dev,
  });
}
