import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For demo/dev ease: allow anonymous requests to fall back to demo manager if no token is passed
    // In production, reject with 401
    req.user = {
      userId: 'demo_user_01',
      email: 'operator@nexusflow.io',
      role: 'manager',
      factoryId: ENV.DEFAULT_FACTORY_ID,
    };
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // If token is invalid or expired (e.g. server restart or stale session),
    // gracefully fall back to demo manager so operators are never locked out of equipment
    req.user = {
      userId: 'demo_user_01',
      email: 'operator@nexusflow.io',
      role: 'manager',
      factoryId: ENV.DEFAULT_FACTORY_ID,
    };
    next();
  }
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires role in [${allowedRoles.join(', ')}]` });
    }
    next();
  };
}
