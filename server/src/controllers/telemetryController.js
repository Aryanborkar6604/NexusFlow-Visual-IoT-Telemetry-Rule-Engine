import { ingestReading } from '../ingestion/ingestionService.js';
import { updateDeviceReading } from './deviceController.js';
import { Telemetry } from '../models/Telemetry.js';
import { isDbConnected } from '../config/db.js';

let socketServerRef = null;

export function setTelemetrySocketServer(server) {
  socketServerRef = server;
}

// In-memory sliding buffer of last 500 readings for instant chart rendering without DB
const recentReadingsBuffer = [];

export async function receiveTelemetry(req, res) {
  const reading = req.body;

  if (!reading.deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  try {
    const processed = ingestReading(reading, socketServerRef);
    updateDeviceReading(processed);

    // Save in sliding buffer
    recentReadingsBuffer.push(processed);
    if (recentReadingsBuffer.length > 500) {
      recentReadingsBuffer.shift();
    }

    res.status(202).json({
      status: 'ingested',
      reading: processed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getTelemetryHistory(req, res) {
  const { deviceId = 'TURBINE_001', limit = 100 } = req.query;

  if (!isDbConnected()) {
    const filtered = recentReadingsBuffer
      .filter((r) => r.deviceId === deviceId)
      .slice(-Number(limit));
    return res.json({ readings: filtered });
  }

  try {
    const data = await Telemetry.find({ 'metadata.deviceId': deviceId })
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    const formatted = data.reverse().map((d) => ({
      timestamp: d.timestamp,
      deviceId: d.metadata.deviceId,
      temperature: d.temperature,
      pressure: d.pressure,
      humidity: d.humidity,
    }));

    res.json({ readings: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
