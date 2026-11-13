import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'viewer'],
    default: 'manager',
  },
  factoryId: {
    type: String,
    default: 'FACTORY_01',
    required: true,
  },
  name: {
    type: String,
    default: 'Operator',
  }
}, {
  timestamps: true,
});

export const User = mongoose.model('User', userSchema);
