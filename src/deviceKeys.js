import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb } from './db.js';
import { requireAuth } from './auth.js';

const hashKey = (value) => createHash('sha256').update(value).digest('hex');
const keyNameSchema = z.object({ name: z.string().trim().min(1).max(100) });

export function registerDeviceKeyRoutes(app) {
  app.post('/api/device-keys', requireAuth, async (req, res, next) => {
    const parsed = keyNameSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'A key name from 1 to 100 characters is required' });
    try {
      const secret = `nxf_${randomBytes(32).toString('base64url')}`;
      const record = {
        _id: randomUUID(),
        ownerId: req.user.id,
        name: parsed.data.name,
        keyHash: hashKey(secret),
        keyPrefix: secret.slice(0, 10),
        createdAt: new Date(),
      };
      await getDb().collection('deviceKeys').insertOne(record);
      return res.status(201).json({ id: record._id, name: record.name, key: secret, createdAt: record.createdAt });
    } catch (error) { return next(error); }
  });

  app.get('/api/device-keys', requireAuth, async (req, res, next) => {
    try {
      const keys = await getDb().collection('deviceKeys')
        .find({ ownerId: req.user.id, revokedAt: { $exists: false } }, { projection: { name: 1, keyPrefix: 1, createdAt: 1 } })
        .sort({ createdAt: -1 }).toArray();
      return res.json(keys);
    } catch (error) { return next(error); }
  });

  app.delete('/api/device-keys/:id', requireAuth, async (req, res, next) => {
    try {
      const result = await getDb().collection('deviceKeys').updateOne(
        { _id: req.params.id, ownerId: req.user.id, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
      );
      if (!result.matchedCount) return res.status(404).json({ error: 'Device key not found' });
      return res.status(204).end();
    } catch (error) { return next(error); }
  });
}

export async function requireIngestAuth(req, res, next) {
  const secret = req.get('x-api-key');
  if (!secret) return requireAuth(req, res, next);
  try {
    const key = await getDb().collection('deviceKeys').findOne(
      { keyHash: hashKey(secret), revokedAt: { $exists: false } },
      { projection: { ownerId: 1 } },
    );
    if (!key) return res.status(401).json({ error: 'Device key is invalid or revoked' });
    req.user = { id: key.ownerId };
    return next();
  } catch (error) { return next(error); }
}

