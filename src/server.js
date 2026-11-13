import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import { config } from './config.js';
import { connectDatabase, closeDatabase, getDb } from './db.js';
import { TelemetryWriter, normalizeTelemetry, publishTelemetry, telemetryEvents } from './telemetry.js';
import { RuleService } from './rules.js';
import { AlertService } from './alerts.js';

const telemetrySchema = z.object({ sensorId: z.string().min(1).max(128), deviceId: z.string().max(128).optional(), siteId: z.string().max(128).optional(), timestamp: z.string().datetime({ offset: true }).optional(), measurements: z.record(z.number().finite()).refine((value) => Object.keys(value).length > 0, 'measurements cannot be empty') });

export async function createServer() {
  await connectDatabase();
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Set();
  const broadcast = (message) => {
    const data = JSON.stringify(message);
    for (const client of clients) if (client.readyState === WebSocket.OPEN) client.send(data);
  };
  telemetryEvents.subscribe((event) => broadcast({
    type: 'telemetry',
    data: {
      sensorId: event.sensorId,
      deviceId: event.deviceId,
      timestamp: event.timestamp,
      measurements: event.measurements,
    },
  }));
  const writer = new TelemetryWriter({ batchSize: config.batchSize, flushMs: config.flushMs });
  const alertService = new AlertService(broadcast);
  const ruleService = new RuleService(alertService);
  await ruleService.loadEnabled();

  app.use(helmet());
  app.use(cors({ origin: config.allowedOrigin }));
  app.use(express.json({ limit: '2mb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  app.post('/api/telemetry', (req, res) => {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    if (rows.length > config.maxBatch) return res.status(413).json({ error: `Maximum ${config.maxBatch} telemetry points per request` });
    const parsed = z.array(telemetrySchema).safeParse(rows);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid telemetry payload', details: parsed.error.issues });
    const documents = parsed.data.map(normalizeTelemetry);
    for (const document of documents) { writer.enqueue(document); publishTelemetry(document); }
    return res.status(202).json({ accepted: documents.length });
  });
  app.get('/api/telemetry/latest', async (req, res, next) => {
    try {
      const sensorId = String(req.query.sensorId ?? '');
      if (!sensorId) return res.status(400).json({ error: 'sensorId query parameter is required' });
      const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100)));
      const data = await getDb().collection('telemetry').find({ 'meta.sensorId': sensorId }).sort({ timestamp: -1 }).limit(limit).toArray();
      return res.json(data);
    } catch (error) { return next(error); }
  });
  app.get('/api/rules', async (_req, res, next) => { try { res.json(await ruleService.list()); } catch (error) { next(error); } });
  app.post('/api/rules', async (req, res, next) => {
    try { res.status(201).json(await ruleService.save(req.body)); }
    catch (error) { if (error.name === 'ZodError' || error.message.includes('Graph')) return res.status(400).json({ error: error.message, details: error.issues }); next(error); }
  });
  app.delete('/api/rules/:id', async (req, res, next) => { try { await ruleService.remove(req.params.id); res.status(204).end(); } catch (error) { next(error); } });
  app.get('/api/alerts', async (req, res, next) => {
    try { const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100))); res.json(await getDb().collection('alerts').find().sort({ timestamp: -1 }).limit(limit).toArray()); }
    catch (error) { next(error); }
  });

  wss.on('connection', (socket) => {
    clients.add(socket);
    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === 'subscribe') { socket.send(JSON.stringify({ type: 'subscribed', sensorId: message.sensorId ?? '*' })); return; }
        if (message.type !== 'telemetry') throw new Error('Expected message type telemetry');
        const parsed = telemetrySchema.parse(message.data);
        const document = normalizeTelemetry(parsed);
        writer.enqueue(document);
        publishTelemetry(document);
        socket.send(JSON.stringify({ type: 'accepted', sensorId: parsed.sensorId }));
      } catch (error) { socket.send(JSON.stringify({ type: 'error', message: error.message })); }
    });
    socket.on('close', () => clients.delete(socket));
  });

  app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Internal server error' }); });
  return { server, writer, wss, close: async () => { await writer.close(); for (const client of clients) client.close(); wss.close(); await closeDatabase(); } };
}
