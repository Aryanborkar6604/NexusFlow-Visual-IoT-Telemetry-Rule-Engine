import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from './db.js';
import { config } from './config.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function issueToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, config.jwtSecret, { expiresIn: '12h', issuer: 'nexusflow' });
}

export function requireAuth(req, res, next) {
  const header = req.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(match[1], config.jwtSecret, { issuer: 'nexusflow' });
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function readToken(token) {
  const payload = jwt.verify(token, config.jwtSecret, { issuer: 'nexusflow' });
  return { id: payload.sub, email: payload.email, expiresAt: payload.exp * 1000 };
}

export function registerAuthRoutes(app) {
  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = req.body?.password;
      if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address' });
      if (typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be between 8 and 128 characters' });
      const passwordHash = await bcrypt.hash(password, 12);
      const user = { email, passwordHash, createdAt: new Date() };
      const result = await getDb().collection('users').insertOne(user);
      user._id = result.insertedId;
      return res.status(201).json({ token: issueToken(user), user: { id: user._id.toString(), email } });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' });
      return next(error);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const user = await getDb().collection('users').findOne({ email });
      const valid = user && typeof req.body?.password === 'string' && await bcrypt.compare(req.body.password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Email or password is incorrect' });
      return res.json({ token: issueToken(user), user: { id: user._id.toString(), email: user.email } });
    } catch (error) { return next(error); }
  });

  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));
}
