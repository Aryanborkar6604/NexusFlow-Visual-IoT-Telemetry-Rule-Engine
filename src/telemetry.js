import { Subject, filter, map, scan } from 'rxjs';
import { getDb } from './db.js';

export const telemetryEvents = new Subject();

export function normalizeTelemetry(input) {
  const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();
  if (Number.isNaN(timestamp.getTime())) throw new Error('timestamp must be a valid date');
  return {
    timestamp,
    meta: { sensorId: input.sensorId, deviceId: input.deviceId ?? 'unknown', siteId: input.siteId ?? 'default' },
    measurements: input.measurements,
  };
}

export class TelemetryWriter {
  #queue = [];
  #timer;
  #writing = false;

  constructor({ batchSize, flushMs }) {
    this.batchSize = batchSize;
    this.#timer = setInterval(() => void this.flush(), flushMs);
    this.#timer.unref();
  }

  enqueue(document) {
    this.#queue.push(document);
    if (this.#queue.length >= this.batchSize) void this.flush();
  }

  async flush() {
    if (this.#writing || this.#queue.length === 0) return;
    this.#writing = true;
    const batch = this.#queue.splice(0, this.batchSize);
    try {
      await getDb().collection('telemetry').insertMany(batch, { ordered: false });
    } catch (error) {
      // Preserve uncommitted data for a later retry; MongoDB may have accepted part of an unordered batch.
      const accepted = error.insertedCount ?? 0;
      this.#queue.unshift(...batch.slice(accepted));
      console.error('Telemetry batch write failed:', error.message);
    } finally {
      this.#writing = false;
    }
    if (this.#queue.length >= this.batchSize) void this.flush();
  }

  async close() {
    clearInterval(this.#timer);
    while (this.#queue.length) await this.flush();
  }
}

export function publishTelemetry(document) {
  telemetryEvents.next({ ...document, sensorId: document.meta.sensorId, deviceId: document.meta.deviceId });
}

export { filter, map, scan };
