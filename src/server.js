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
import { forecastTelemetry } from './forecast.js';
import { readToken, registerAuthRoutes, requireAuth } from './auth.js';
import { registerDeviceKeyRoutes, requireIngestAuth } from './deviceKeys.js';

const telemetrySchema = z.object({ sensorId: z.string().min(1).max(128), deviceId: z.string().max(128).optional(), siteId: z.string().max(128).optional(), timestamp: z.string().datetime({ offset: true }).optional(), measurements: z.record(z.number().finite()).refine((value) => Object.keys(value).length > 0, 'measurements cannot be empty') });

export async function createServer() {
  await connectDatabase();
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws', perMessageDeflate: false, maxPayload: 256 * 1024 });
  const clients = new Set();
  const broadcast = (message) => {
    const data = JSON.stringify(message);
    for (const client of clients) {
      if (message.ownerId && client.userId !== message.ownerId) continue;
      if (client.readyState !== WebSocket.OPEN) continue;
      if (client.bufferedAmount > config.maxWebSocketBufferedBytes) {
        client.close(1013, 'Client cannot keep up');
        continue;
      }
      client.send(data);
    }
  };
  telemetryEvents.subscribe((event) => broadcast({
    type: 'telemetry',
    ownerId: event.ownerId,
    data: {
      sensorId: event.sensorId,
      deviceId: event.deviceId,
      timestamp: event.timestamp,
      measurements: event.measurements,
    },
  }));
  const writer = new TelemetryWriter({ batchSize: config.batchSize, flushMs: config.flushMs, maxPending: config.maxPendingTelemetry });
  const alertService = new AlertService(broadcast);
  const ruleService = new RuleService(alertService);
  await ruleService.loadEnabled();

  app.use(helmet());
  app.use(cors({ origin: config.allowedOrigin }));
  app.use(express.json({ limit: '2mb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  registerAuthRoutes(app);
  registerDeviceKeyRoutes(app);
  app.post('/api/telemetry', requireIngestAuth, (req, res) => {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    if (rows.length > config.maxBatch) return res.status(413).json({ error: `Maximum ${config.maxBatch} telemetry points per request` });
    const parsed = z.array(telemetrySchema).safeParse(rows);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid telemetry payload', details: parsed.error.issues });
    const documents = parsed.data.map((point) => normalizeTelemetry({ ...point, ownerId: req.user.id }));
    if (!writer.hasCapacity(documents.length)) return res.status(503).json({ error: 'Telemetry queue is full; retry shortly' });
    for (const document of documents) { writer.enqueue(document); publishTelemetry(document); }
    return res.status(202).json({ accepted: documents.length });
  });
  app.use('/api', requireAuth);
  app.get('/api/telemetry/latest', async (req, res, next) => {
    try {
      const sensorId = String(req.query.sensorId ?? '');
      if (!sensorId) return res.status(400).json({ error: 'sensorId query parameter is required' });
      const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100)));
      const data = await getDb().collection('telemetry').find({ 'meta.sensorId': sensorId, 'meta.ownerId': req.user.id }).sort({ timestamp: -1 }).limit(limit).toArray();
      return res.json(data);
    } catch (error) { return next(error); }
  });
  app.get('/api/telemetry/forecast', async (req, res, next) => {
    try {
      const sensorId = String(req.query.sensorId ?? '');
      const field = String(req.query.field ?? '');
      const model = String(req.query.model ?? 'linear-trend');
      const horizon = Number(req.query.horizon ?? 5);
      const limit = Number(req.query.limit ?? 100);
      const window = req.query.window === undefined ? undefined : Number(req.query.window);
      const alpha = Number(req.query.alpha ?? 0.3);
      const seasonLength = Number(req.query.seasonLength ?? 2);
      if (!sensorId || !field) return res.status(400).json({ error: 'sensorId and field query parameters are required' });
      if (!Number.isInteger(horizon) || horizon < 1 || horizon > 100) return res.status(400).json({ error: 'horizon must be an integer from 1 to 100' });
      if (!Number.isInteger(limit) || limit < 3 || limit > 500) return res.status(400).json({ error: 'limit must be an integer from 3 to 500' });
      const points = await getDb().collection('telemetry')
        .find({ 'meta.sensorId': sensorId, 'meta.ownerId': req.user.id }, { projection: { timestamp: 1, measurements: 1 } })
        .sort({ timestamp: -1 }).limit(limit).toArray();
      try {
        return res.json(forecastTelemetry(points, { field, horizon, model, window, alpha, seasonLength }));
      } catch (error) {
        return res.status(422).json({ error: error.message });
      }
    } catch (error) { return next(error); }
  });
  app.get('/api/rules', async (req, res, next) => { try { res.json(await ruleService.list(req.user.id)); } catch (error) { next(error); } });
  app.post('/api/rules', async (req, res, next) => {
    try { res.status(201).json(await ruleService.save(req.body, req.user.id)); }
    catch (error) { if (error.name === 'ZodError' || error.message.includes('Graph')) return res.status(400).json({ error: error.message, details: error.issues }); next(error); }
  });
  app.delete('/api/rules/:id', async (req, res, next) => { try { const removed = await ruleService.remove(req.params.id, req.user.id); if (!removed) return res.status(404).json({ error: 'Rule not found' }); return res.status(204).end(); } catch (error) { next(error); } });
  app.get('/api/alerts', async (req, res, next) => {
    try { const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100))); res.json(await getDb().collection('alerts').find({ ownerId: req.user.id }).sort({ timestamp: -1 }).limit(limit).toArray()); }
    catch (error) { next(error); }
  });

  wss.on('connection', (socket) => {
    let user;
    try { user = readToken(new URL(socket.url, 'http://localhost').searchParams.get('token') ?? ''); }
    catch { socket.close(1008, 'Authentication required'); return; }
    if (clients.size >= config.maxWebSocketClients) { socket.close(1013, 'Server is at capacity'); return; }
    socket.userId = user.id;
    clients.add(socket);
    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === 'subscribe') { socket.send(JSON.stringify({ type: 'subscribed', sensorId: message.sensorId ?? '*' })); return; }
        if (message.type !== 'telemetry') throw new Error('Expected message type telemetry');
        const parsed = telemetrySchema.parse(message.data);
        const document = normalizeTelemetry({ ...parsed, ownerId: user.id });
        if (!writer.enqueue(document)) {
          socket.send(JSON.stringify({ type: 'error', message: 'Telemetry queue is full; retry shortly' }));
          return;
        }
        publishTelemetry(document);
        socket.send(JSON.stringify({ type: 'accepted', sensorId: parsed.sensorId }));
      } catch (error) { socket.send(JSON.stringify({ type: 'error', message: error.message })); }
    });
    socket.on('close', () => clients.delete(socket));
  });

  app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Internal server error' }); });
  return { server, writer, wss, close: async () => { await writer.close(); for (const client of clients) client.close(); wss.close(); await closeDatabase(); } };
}
