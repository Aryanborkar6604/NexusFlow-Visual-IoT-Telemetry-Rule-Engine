
import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
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
      trim: true,
    },

    triggeredNodeId: {
      type: String,
      required: true,
      trim: true,
    },

    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['fired', 'acknowledged', 'resolved'],
      default: 'fired',
    },

    recipient: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Improve alert history queries by factory and creation time
alertSchema.index({ factoryId: 1, createdAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema);
