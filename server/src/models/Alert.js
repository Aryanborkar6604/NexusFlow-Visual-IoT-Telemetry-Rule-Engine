import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true,
  },
  factoryId: {
    type: String,
    default: 'FACTORY_01',
    required: true,
    index: true,
  },
  workflowId: {
    type: String,
    required: true,
    index: true,
  },
  workflowName: {
    type: String,
    default: 'Workflow',
  },
  triggeredNodeId: {
    type: String,
    required: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['fired', 'acknowledged', 'resolved'],
    default: 'fired',
  },
  recipient: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

export const Alert = mongoose.model('Alert', alertSchema);
