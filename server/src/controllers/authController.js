import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ENV } from '../config/env.js';
import { isDbConnected } from '../config/db.js';

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Demo user fallback if database is not active
  if (!isDbConnected()) {
    const token = jwt.sign(
      {
        userId: 'demo_user_01',
        email,
        role: email.includes('admin') ? 'admin' : 'manager',
        factoryId: ENV.DEFAULT_FACTORY_ID,
      },
      ENV.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: 'demo_user_01',
        email,
        role: email.includes('admin') ? 'admin' : 'manager',
        factoryId: ENV.DEFAULT_FACTORY_ID,
        name: 'Demo Manager',
      },
    });
  }

  try {
    let user = await User.findOne({ email });

    // Seed default admin/manager on first login if not exists
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await User.create({
        email,
        passwordHash,
        role: email.includes('admin') ? 'admin' : 'manager',
        factoryId: ENV.DEFAULT_FACTORY_ID,
        name: email.split('@')[0],
      });
    } else {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        factoryId: user.factoryId,
      },
      ENV.JWT_SECRET,
      { expiresIn: '24h' }
    );

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
