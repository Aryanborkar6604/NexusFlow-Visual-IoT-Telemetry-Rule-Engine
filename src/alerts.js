import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';

export class AlertService {
  constructor(broadcast) { this.broadcast = broadcast; }

  async send(alert) {
    const record = { _id: randomUUID(), ruleId: alert.ruleId, ruleName: alert.ruleName, sensorId: alert.event.sensorId, timestamp: new Date(), value: alert.event.movingAverage ?? alert.event.value ?? alert.event.measurements?.value, message: alert.node.message ?? `${alert.ruleName} triggered`, status: 'triggered' };
    this.broadcast({ type: 'alert', data: record });
    try {
      if (alert.node.webhookUrl) {
        const response = await fetch(alert.node.webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(record), signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
        record.status = 'delivered';
      } else if (alert.node.phone) {
        console.info(`Mock SMS to ${alert.node.phone}: ${record.message}`);
        record.status = 'mock-delivered';
      }
    } catch (error) {
      record.status = 'failed';
      record.error = error.message;
      console.error('Alert delivery failed:', error.message);
    }
    await getDb().collection('alerts').insertOne(record);
  }
}
