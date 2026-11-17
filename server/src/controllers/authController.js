import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ENV } from '../config/env.js';
import { isDbConnected } from '../config/db.js';

// In-memory fallback users for offline/demo resilience
const inMemoryUsers = new Map([
  [
    'manager@nexusflow.io',
    {
      id: 'usr_manager_01',
      name: 'Elena Vance (Manager)',
      email: 'manager@nexusflow.io',
      passwordHash: '$2a$10$DEMO_HASH_PLACEHOLDER',
      role: 'manager',
      factoryId: 'FACTORY_01',
    },
  ],
  [
    'engineer@nexusflow.io',
    {
      id: 'usr_engineer_02',
      name: 'Marcus Chen (Engineer)',
      email: 'engineer@nexusflow.io',
      passwordHash: '$2a$10$DEMO_HASH_PLACEHOLDER',
      role: 'viewer',
      factoryId: 'FACTORY_01',
    },
  ],
  [
    'admin@nexusflow.io',
    {
      id: 'usr_admin_03',
      name: 'Dr. Sarah Connor (Admin)',
      email: 'admin@nexusflow.io',
      passwordHash: '$2a$10$DEMO_HASH_PLACEHOLDER',
      role: 'admin',
      factoryId: 'FACTORY_01',
    },
  ],
]);

function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id || user.id,
      email: user.email,
      role: user.role,
      factoryId: user.factoryId || ENV.DEFAULT_FACTORY_ID,
      name: user.name,
    },
    ENV.JWT_SECRET,
    { expiresIn: '48h' }
  );
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. In-memory fallback if database is offline
  if (!isDbConnected()) {
    let user = inMemoryUsers.get(cleanEmail);
    if (!user) {
      user = {
        id: `usr_${Date.now()}`,
        email: cleanEmail,
        role: cleanEmail.includes('admin') ? 'admin' : 'manager',
        factoryId: ENV.DEFAULT_FACTORY_ID,
        name: cleanEmail.split('@')[0],
      };
      inMemoryUsers.set(cleanEmail, user);
    }
    const token = generateToken(user);
    return res.json({ token, user });
  }

  // 2. Database lookup
  try {
    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // Auto-seed user on first demo attempt
      const passwordHash = await bcrypt.hash(password, 10);
      user = await User.create({
        email: cleanEmail,
        passwordHash,
        role: cleanEmail.includes('admin') ? 'admin' : 'manager',
        factoryId: ENV.DEFAULT_FACTORY_ID,
        name: cleanEmail.split('@')[0],
      });
    } else {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        factoryId: user.factoryId,
        name: user.name,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function register(req, res) {
  const { name, email, password, role = 'manager', factoryId = 'FACTORY_01' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const userName = name?.trim() || cleanEmail.split('@')[0];

  // 1. In-memory fallback
  if (!isDbConnected()) {
    if (inMemoryUsers.has(cleanEmail)) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const user = {
      id: `usr_${Date.now()}`,
      name: userName,
      email: cleanEmail,
      role: ['admin', 'manager', 'viewer'].includes(role) ? role : 'manager',
      factoryId,
    };
    inMemoryUsers.set(cleanEmail, user);
    const token = generateToken(user);
    return res.status(201).json({ token, user });
  }

  // 2. Database persistence
  try {
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: userName,
      email: cleanEmail,
      passwordHash,
      role: ['admin', 'manager', 'viewer'].includes(role) ? role : 'manager',
      factoryId,
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        factoryId: user.factoryId,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export function getMe(req, res) {
  res.json({ user: req.user });
}
