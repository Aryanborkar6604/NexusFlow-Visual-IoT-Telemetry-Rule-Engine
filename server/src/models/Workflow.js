import mongoose from 'mongoose';

const workflowSchema = new mongoose.Schema({
  workflowId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'inactive',
  },
  factoryId: {
    type: String,
    default: 'FACTORY_01',
    required: true,
    index: true,
  },
  nodes: {
    type: [mongoose.Schema.Types.Mixed],
    required: true,
    default: [],
  },
  edges: {
    type: [mongoose.Schema.Types.Mixed],
    required: true,
    default: [],
  },
  description: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

export const Workflow = mongoose.model('Workflow', workflowSchema);
