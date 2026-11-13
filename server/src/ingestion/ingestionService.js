import { Subject } from 'rxjs';
import { Telemetry } from '../models/Telemetry.js';
import { isDbConnected } from '../config/db.js';

// In-memory RxJS streams keyed by deviceId
const deviceStreams = new Map();

/**
 * Returns or creates the RxJS Subject for a given deviceId
 */
export function getOrCreateDeviceStream(deviceId) {
  if (!deviceStreams.has(deviceId)) {
    deviceStreams.set(deviceId, new Subject());
  }
  return deviceStreams.get(deviceId);
}

/**
 * Ingests a telemetry reading:
 * 1. Synchronously pushes to live RxJS Subject (zero latency hot path)
 * 2. Decoupled asynchronous persistence to MongoDB time-series
 * 3. Broadcasts via Socket.IO
 */
export function ingestReading(reading, socketServer = null) {
  const { deviceId, factoryId = 'FACTORY_01', timestamp = new Date() } = reading;

  if (!deviceId) {
    throw new Error('Telemetry reading missing deviceId');
  }

  const payload = {
    deviceId,
    factoryId,
    timestamp: new Date(timestamp),
    temperature: reading.temperature !== undefined ? Number(reading.temperature) : undefined,
    pressure: reading.pressure !== undefined ? Number(reading.pressure) : undefined,
    humidity: reading.humidity !== undefined ? Number(reading.humidity) : undefined,
  };

  // 1. Live stream broadcast (Hot path)
  const stream$ = getOrCreateDeviceStream(deviceId);
  stream$.next(payload);

  // 2. Real-time Socket.IO emission to dashboard
  if (socketServer) {
    socketServer.emitToFactory(factoryId, 'telemetry:update', payload);
  }

  // 3. Decoupled asynchronous persistence (Fire-and-forget, non-blocking)
  if (isDbConnected()) {
    Telemetry.create({
      timestamp: payload.timestamp,
      metadata: {
        deviceId: payload.deviceId,
        factoryId: payload.factoryId,
      },
      temperature: payload.temperature,
      pressure: payload.pressure,
      humidity: payload.humidity,
    }).catch((err) => {
      console.error(`[Ingestion] Failed to persist telemetry for ${deviceId}: ${err.message}`);
    });
  }

  return payload;
}
