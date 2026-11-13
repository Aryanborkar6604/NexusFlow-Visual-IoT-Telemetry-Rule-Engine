import { alertEngine } from '../alerts/alertEngine.js';
import { Alert } from '../models/Alert.js';
import { isDbConnected } from '../config/db.js';
import { ingestReading } from '../ingestion/ingestionService.js';
import { updateDeviceReading } from './deviceController.js';

let socketServerRef = null;

export function setAlertSocketServer(server) {
  socketServerRef = server;
}

export async function getAlerts(req, res) {
  const factoryId = req.user?.factoryId || 'FACTORY_01';
  const { limit = 50 } = req.query;

  if (!isDbConnected()) {
    const list = alertEngine.getRecentAlerts(Number(limit));
    return res.json({ alerts: list });
  }

  try {
    const list = await Alert.find({ factoryId })
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.json({ alerts: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Trigger an immediate simulated spike for live demo testing
 */
export async function triggerDemoSpike(req, res) {
  const { deviceId = 'TURBINE_001', temperature = 92.5 } = req.body;

  const spikeReading = {
    deviceId,
    factoryId: req.user?.factoryId || 'FACTORY_01',
    temperature: Number(temperature),
    pressure: 135,
    humidity: 44,
    timestamp: new Date().toISOString(),
  };

  const processed = ingestReading(spikeReading, socketServerRef);
  updateDeviceReading(processed);

  res.json({
    message: `Injected simulated spike: ${temperature}°C on ${deviceId}`,
    reading: processed,
  });
}
