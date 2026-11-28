import http from 'node:http';
import { ObjectId } from 'mongodb';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { WebSocket, WebSocketServer } from 'ws';
import { config } from './config.js';
import { closeDatabase, getDb } from './db.js';
import { readToken, registerAuthRoutes, requireAuth } from './auth.js';
import { evaluateCondition, RuleValidationError, validateRuleGraph } from './rules.js';

const telemetryBody = (point) => {
  if (!point || typeof point !== 'object' || Array.isArray(point)) throw new TelemetryValidationError('Telemetry point must be an object');
  if (typeof point.sensorId !== 'string' || !point.sensorId.trim() || point.sensorId.length > 128) throw new TelemetryValidationError('sensorId is required and must be at most 128 characters');
  if (!point.measurements || typeof point.measurements !== 'object' || Array.isArray(point.measurements) || !Object.keys(point.measurements).length) throw new TelemetryValidationError('measurements must contain numeric fields');
  for (const [key, value] of Object.entries(point.measurements)) if (!/^[a-zA-Z0-9_-]{1,128}$/.test(key) || typeof value !== 'number' || !Number.isFinite(value)) throw new TelemetryValidationError('Measurement names must use letters, numbers, underscores, or hyphens and values must be finite numbers');
  const timestamp = point.timestamp === undefined ? new Date() : new Date(point.timestamp);
  if (Number.isNaN(timestamp.getTime())) throw new TelemetryValidationError('timestamp must be a valid date');
  return {
    timestamp,
    meta: { ownerId: '', sensorId: point.sensorId.trim(), deviceId: typeof point.deviceId === 'string' ? point.deviceId.slice(0, 128) : undefined, siteId: typeof point.siteId === 'string' ? point.siteId.slice(0, 128) : undefined },
    measurements: point.measurements,
  };
};

class TelemetryValidationError extends Error {}

const ownsId = (value) => ObjectId.isValid(value) ? new ObjectId(value) : null;

export async function createServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 256 * 1024 });
  const clients = new Set();
  const publish = (event) => {
    const message = JSON.stringify(event);
    for (const socket of clients) {
      if (socket.userId !== event.ownerId || socket.readyState !== WebSocket.OPEN) continue;
      if (event.type === 'telemetry' && socket.subscribedSensorId && socket.subscribedSensorId !== '*' && socket.subscribedSensorId !== event.data.sensorId) continue;
      if (socket.bufferedAmount > 1024 * 1024) { socket.close(1013, 'Client cannot keep up'); continue; }
      socket.send(message);
    }
  };

  const deliverAlert = async ({ ownerId, rule, node, telemetry, measurements }) => {
    const alert = {
      ownerId: new ObjectId(ownerId), ruleId: rule._id, ruleName: rule.name,
      sensorId: telemetry.meta.sensorId, timestamp: new Date(),
      measurements,
      message: String(node.data.message || `${node.data.title || rule.name} was triggered`),
      channel: node.data.webhookUrl ? 'webhook' : 'sms', status: 'mocked',
      recipient: node.data.webhookUrl || node.data.phone || null,
    };
    const result = await getDb().collection('alerts').insertOne(alert);
    publish({ type: 'alert', ownerId, data: { ...alert, _id: result.insertedId.toString(), ownerId: undefined, ruleId: String(rule._id) } });
  };

  const runRule = async (rule, ownerId, telemetry) => {
    let validated;
    try { validated = validateRuleGraph(rule.graph); } catch { return; }
    if (validated.source.data.sensorId !== telemetry.meta.sensorId) return;
    const startField = validated.source.data.field ?? Object.keys(telemetry.measurements)[0];
    const initial = Number(telemetry.measurements[startField]);
    if (!Number.isFinite(initial)) return;
    const queue = [{ node: validated.source, value: initial, measurements: { ...telemetry.measurements } }];
    const processed = new Set();
    while (queue.length) {
      const { node, value: incomingValue, measurements: incomingMeasurements } = queue.shift();
      if (processed.has(node.id)) continue;
      processed.add(node.id);
      let value = incomingValue;
      const measurements = { ...incomingMeasurements };
      let conditionPassed;
      if (node.type === 'movingAverage') {
        const field = node.data.field ?? startField;
        const window = Number(node.data.window ?? 5);
        const recent = await getDb().collection('telemetry')
          .find({ 'meta.ownerId': new ObjectId(ownerId), 'meta.sensorId': telemetry.meta.sensorId, timestamp: { $lte: telemetry.timestamp } }, { projection: { [`measurements.${field}`]: 1, timestamp: 1 } })
          .sort({ timestamp: -1 }).limit(window).toArray();
        const values = recent.map((sample) => sample.measurements?.[field]).filter(Number.isFinite);
        if (!values.length) continue;
        value = values.reduce((sum, item) => sum + item, 0) / values.length;
        measurements[field] = value;
      } else if (node.type === 'mathOperation') {
        const operand = Number(node.data.operand);
        const inputValue = Number(node.data.field ? measurements[node.data.field] ?? value : value);
        if (!Number.isFinite(inputValue)) continue;
        const operations = { add: inputValue + operand, subtract: inputValue - operand, multiply: inputValue * operand, divide: inputValue / operand, modulo: inputValue % operand };
        value = operations[node.data.operation];
        if (!Number.isFinite(value)) continue;
        measurements[node.data.outputField ?? 'result'] = value;
      } else if (node.type === 'condition') {
        const compared = Number(node.data.field ? measurements[node.data.field] ?? value : value);
        conditionPassed = evaluateCondition(compared, node.data.operator, node.data.value);
      } else if (node.type === 'alert') {
        await deliverAlert({ ownerId, rule, node, telemetry, measurements });
        continue;
      }
      let outgoing = validated.outgoing.get(node.id) ?? [];
      if (node.type === 'condition') {
        outgoing = outgoing.filter((edge) => {
          const handle = String(edge.sourceHandle ?? '').toLowerCase();
          if (conditionPassed) return !handle || ['true', 'yes', 'pass'].includes(handle);
          return ['false', 'no', 'fail'].includes(handle);
        });
      }
      for (const edge of outgoing) {
        const target = validated.nodes.find((candidate) => candidate.id === edge.target);
        if (target) queue.push({ node: target, value, measurements: { ...measurements } });
      }
    }
  };

  const ingestPoint = async (ownerId, input) => {
    const row = telemetryBody(input);
    row.meta.ownerId = ownerId;
    await getDb().collection('telemetry').insertOne(row);
    publish({ type: 'telemetry', ownerId, data: { sensorId: row.meta.sensorId, deviceId: row.meta.deviceId, timestamp: row.timestamp, measurements: row.measurements } });
    const rules = await getDb().collection('rules').find({ ownerId: new ObjectId(ownerId), enabled: true }).toArray().catch((error) => { console.error('Could not load rules for telemetry point', error); return []; });
    await Promise.all(rules.map((rule) => runRule(rule, ownerId, row).catch((error) => console.error(`Rule ${rule._id} failed for sensor ${row.meta.sensorId}`, error))));
    return row;
  };

  const ingestBatch = async (ownerId, inputs) => {
    const rows = inputs.map(telemetryBody);
    rows.forEach((row) => { row.meta.ownerId = ownerId; });
    await getDb().collection('telemetry').insertMany(rows, { ordered: true });
    rows.forEach((row) => publish({ type: 'telemetry', ownerId, data: { sensorId: row.meta.sensorId, deviceId: row.meta.deviceId, timestamp: row.timestamp, measurements: row.measurements } }));
    const rules = await getDb().collection('rules').find({ ownerId: new ObjectId(ownerId), enabled: true }).toArray().catch((error) => { console.error('Could not load rules for telemetry batch', error); return []; });
    await Promise.all(rows.flatMap((row) => rules.map((rule) => runRule(rule, ownerId, row).catch((error) => console.error(`Rule ${rule._id} failed for sensor ${row.meta.sensorId}`, error)))));
    return rows;
  };

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.allowedOrigin.split(',').map((origin) => origin.trim()), credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  registerAuthRoutes(app);

  app.use('/api', requireAuth);
  app.get('/api/rules', async (req, res, next) => {
    try {
      const rules = await getDb().collection('rules').find({ ownerId: new ObjectId(req.user.id) }).sort({ updatedAt: -1 }).toArray();
      res.json(rules.map(({ ownerId, ...rule }) => ({ ...rule, _id: rule._id.toString() })));
    } catch (error) { next(error); }
  });
  app.post('/api/rules', async (req, res, next) => {
    try {
      const name = String(req.body?.name ?? '').trim();
      if (!name || name.length > 120) return res.status(400).json({ error: 'Rule name must be between 1 and 120 characters' });
      validateRuleGraph(req.body.graph);
      const document = { ownerId: new ObjectId(req.user.id), name, enabled: req.body.enabled !== false, graph: req.body.graph, updatedAt: new Date() };
      const result = await getDb().collection('rules').insertOne(document);
      return res.status(201).json({ ...document, _id: result.insertedId.toString(), ownerId: undefined });
    } catch (error) {
      if (error instanceof RuleValidationError) return res.status(400).json({ error: error.message });
      return next(error);
    }
  });
  app.put('/api/rules/:id', async (req, res, next) => {
    try {
      const _id = ownsId(req.params.id);
      if (!_id) return res.status(404).json({ error: 'Rule not found' });
      const name = String(req.body?.name ?? '').trim();
      if (!name || name.length > 120) return res.status(400).json({ error: 'Rule name must be between 1 and 120 characters' });
      validateRuleGraph(req.body.graph);
      const document = { name, enabled: req.body.enabled !== false, graph: req.body.graph, updatedAt: new Date() };
      const result = await getDb().collection('rules').findOneAndUpdate({ _id, ownerId: new ObjectId(req.user.id) }, { $set: document }, { returnDocument: 'after' });
      if (!result) return res.status(404).json({ error: 'Rule not found' });
      const { ownerId, ...rule } = result;
      return res.json({ ...rule, _id: rule._id.toString() });
    } catch (error) {
      if (error instanceof RuleValidationError) return res.status(400).json({ error: error.message });
      return next(error);
    }
  });
  app.delete('/api/rules/:id', async (req, res, next) => {
    try {
      const _id = ownsId(req.params.id);
      if (!_id) return res.status(404).json({ error: 'Rule not found' });
      const result = await getDb().collection('rules').deleteOne({ _id, ownerId: new ObjectId(req.user.id) });
      return result.deletedCount ? res.status(204).end() : res.status(404).json({ error: 'Rule not found' });
    } catch (error) { return next(error); }
  });
  app.post('/api/telemetry', async (req, res, next) => {
    try {
      const rows = Array.isArray(req.body) ? req.body : [req.body];
      if (!rows.length || rows.length > config.maxTelemetryBatch) return res.status(413).json({ error: `Send between 1 and ${config.maxTelemetryBatch} telemetry points` });
      for (const row of rows) telemetryBody(row);
      await ingestBatch(req.user.id, rows);
      return res.status(202).json({ accepted: rows.length });
    } catch (error) {
      if (error instanceof TelemetryValidationError) return res.status(400).json({ error: error.message });
      return next(error);
    }
  });
  app.get('/api/telemetry/latest', async (req, res, next) => {
    try {
      const sensorId = String(req.query.sensorId ?? '');
      const limit = Number(req.query.limit ?? 100);
      if (!sensorId) return res.status(400).json({ error: 'sensorId is required' });
      if (!Number.isInteger(limit) || limit < 1 || limit > 500) return res.status(400).json({ error: 'limit must be between 1 and 500' });
      const rows = await getDb().collection('telemetry').find({ 'meta.ownerId': req.user.id, 'meta.sensorId': sensorId }).sort({ timestamp: -1 }).limit(limit).toArray();
      return res.json(rows.map((row) => ({ ...row, _id: row._id.toString(), meta: { ...row.meta, ownerId: undefined } })));
    } catch (error) { return next(error); }
  });
  app.get('/api/alerts', async (req, res, next) => {
    try {
      const limit = Number(req.query.limit ?? 100);
      if (!Number.isInteger(limit) || limit < 1 || limit > 500) return res.status(400).json({ error: 'limit must be between 1 and 500' });
      const alerts = await getDb().collection('alerts').find({ ownerId: new ObjectId(req.user.id) }).sort({ timestamp: -1 }).limit(limit).toArray();
      return res.json(alerts.map(({ ownerId, ...alert }) => ({ ...alert, _id: alert._id.toString(), ruleId: String(alert.ruleId) })));
    } catch (error) { return next(error); }
  });

  server.on('upgrade', (request, socket, head) => {
    if (new URL(request.url, 'http://localhost').pathname !== '/ws') { socket.destroy(); return; }
    wss.handleUpgrade(request, socket, head, (websocket) => wss.emit('connection', websocket, request));
  });
  wss.on('connection', (socket, request) => {
    let user;
    try { user = readToken(new URL(request.url, 'http://localhost').searchParams.get('token') ?? ''); }
    catch { socket.close(1008, 'Authentication required'); return; }
    if (clients.size >= config.maxWebSocketClients) { socket.close(1013, 'Server is at capacity'); return; }
    socket.userId = user.id;
    clients.add(socket);
    socket.authExpiry = setTimeout(() => socket.close(1008, 'Authentication expired'), Math.max(0, user.expiresAt - Date.now()));
    socket.send(JSON.stringify({ type: 'connected' }));
    socket.on('message', async (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === 'subscribe') {
          socket.subscribedSensorId = typeof message.sensorId === 'string' ? message.sensorId : '*';
          socket.send(JSON.stringify({ type: 'subscribed', sensorId: socket.subscribedSensorId }));
          return;
        }
        if (message.type !== 'telemetry') throw new Error('Expected telemetry or subscribe message');
        const row = await ingestPoint(user.id, message.data);
        socket.send(JSON.stringify({ type: 'accepted', sensorId: row.meta.sensorId }));
      } catch (error) { socket.send(JSON.stringify({ type: 'error', message: error.message })); }
    });
    socket.on('close', () => { clearTimeout(socket.authExpiry); clients.delete(socket); });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  });
  return { server, close: async () => { for (const socket of clients) socket.close(); await new Promise((resolve) => wss.close(resolve)); await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await closeDatabase(); } };
}
