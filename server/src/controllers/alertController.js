
import { alertEngine } from '../alerts/alertEngine.js';
import { Alert } from '../models/Alert.js';
import { isDbConnected } from '../config/db.js';
import { ingestReading } from '../ingestion/ingestionService.js';
import { updateDeviceReading } from './deviceController.js';

let socketServerRef = null;

export function setAlertSocketServer(server) {
  socketServerRef = server;
}

// Get recent alerts
export async function getAlerts(req, res) {
  try {
    const factoryId = req.user?.factoryId || 'FACTORY_01';

    const requestedLimit = Number(req.query.limit || 50);

    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 200)
      : 50;

    if (!isDbConnected()) {
      const list = alertEngine
        .getRecentAlerts(limit)
        .filter((alert) => alert.factoryId === factoryId);

      return res.json({ alerts: list });
    }

    const list = await Alert.find({ factoryId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ alerts: list });
  } catch (err) {
    console.error('[AlertController] Failed to fetch alerts:', err.message);

    return res.status(500).json({
      message: 'Failed to fetch alerts',
    });
  }
}

// Trigger an immediate simulated spike for live demo testing
export async function triggerDemoSpike(req, res) {
  try {
    const {
      deviceId = 'TURBINE_001',
      temperature = 92.5,
    } = req.body || {};

    if (
      typeof deviceId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,50}$/.test(deviceId)
    ) {
      return res.status(400).json({
        message: 'Invalid device ID',
      });
    }

    const numericTemperature = Number(temperature);

    if (
      !Number.isFinite(numericTemperature) ||
      numericTemperature < -50 ||
      numericTemperature > 250
    ) {
      return res.status(400).json({
        message: 'Temperature must be between -50°C and 250°C',
      });
    }

    const spikeReading = {
      deviceId,
      factoryId: req.user?.factoryId || 'FACTORY_01',
      temperature: numericTemperature,
      pressure: 135,
      humidity: 44,
      timestamp: new Date().toISOString(),
    };

    const processed = ingestReading(spikeReading, socketServerRef);

    updateDeviceReading(processed);

    return res.json({
      message: `Injected simulated spike: ${numericTemperature}°C on ${deviceId}`,
      reading: processed,
    });
  } catch (err) {
    console.error('[AlertController] Failed to trigger demo spike:', err.message);

    return res.status(500).json({
      message: 'Failed to trigger test spike',
    });
  }
}
