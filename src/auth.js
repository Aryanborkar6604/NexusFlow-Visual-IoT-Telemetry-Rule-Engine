import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { config } from './config.js';
import { getDb } from './db.js';

const credentialsSchema = z.object({
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});

const publicUser = (user) => ({ id: user._id, email: user.email, createdAt: user.createdAt });
const signToken = (user) => jwt.sign({ sub: user._id, email: user.email }, config.jwtSecret, { expiresIn: '12h' });

export function registerAuthRoutes(app) {
  app.post('/api/auth/register', async (req, res, next) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Use a valid email and a password with at least 8 characters', details: parsed.error.issues });
    try {
      const { email, password } = parsed.data;
      const users = getDb().collection('users');
      if (await users.findOne({ email }, { projection: { _id: 1 } })) return res.status(409).json({ error: 'An account with this email already exists' });
      const user = { _id: randomUUID(), email, passwordHash: await bcrypt.hash(password, 12), createdAt: new Date() };
      await users.insertOne(user);
      return res.status(201).json({ token: signToken(user), user: publicUser(user) });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' });
      return next(error);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Use a valid email and password' });
    try {
      const user = await getDb().collection('users').findOne({ email: parsed.data.email });
      if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect' });
      return res.json({ token: signToken(user), user: publicUser(user) });
    } catch (error) { return next(error); }
  });

  app.get('/api/auth/me', requireAuth, async (req, res, next) => {
    try {
      const user = await getDb().collection('users').findOne({ _id: req.user.id }, { projection: { email: 1, createdAt: 1 } });
      if (!user) return res.status(401).json({ error: 'Account no longer exists' });
      return res.json({ user: publicUser(user) });
    } catch (error) { return next(error); }
  });
}

export function readToken(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  if (typeof payload === 'string' || typeof payload.sub !== 'string') throw new Error('Invalid token');
  return { id: payload.sub, email: payload.email };
}

export function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return res.status(401).json({ error: 'Bearer token required' });
  try { req.user = readToken(authorization.slice(7)); return next(); }
  catch { return res.status(401).json({ error: 'Token is invalid or expired' }); }
}
