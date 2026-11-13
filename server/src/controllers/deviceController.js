// In-memory registry of known factory devices
const devices = [
  {
    deviceId: 'TURBINE_001',
    name: 'Main Turbine Unit #1',
    type: 'Turbine',
    fields: ['temperature', 'pressure', 'humidity'],
    status: 'online',
    lastReading: { temperature: 72.4, pressure: 118, humidity: 42, timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'PUMP_002',
    name: 'Coolant Pump #2',
    type: 'Pump',
    fields: ['temperature', 'pressure'],
    status: 'online',
    lastReading: { temperature: 55.1, pressure: 95, timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'BOILER_003',
    name: 'Industrial Steam Boiler',
    type: 'Boiler',
    fields: ['temperature', 'pressure'],
    status: 'online',
    lastReading: { temperature: 94.8, pressure: 140, timestamp: new Date().toISOString() },
  },
  {
    deviceId: 'CONVEYOR_004',
    name: 'Assembly Line Conveyor',
    type: 'Conveyor',
    fields: ['temperature', 'humidity'],
    status: 'online',
    lastReading: { temperature: 38.2, humidity: 55, timestamp: new Date().toISOString() },
  },
];

export function getDevices(req, res) {
  res.json({ devices });
}

export function updateDeviceReading(reading) {
  const dev = devices.find((d) => d.deviceId === reading.deviceId);
  if (dev) {
    dev.lastReading = {
      ...dev.lastReading,
      ...reading,
      timestamp: new Date().toISOString(),
    };
    dev.status = 'online';
  }
}
