import mongoose from 'mongoose';

const telemetrySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true,
  },
  metadata: {
    deviceId: { type: String, required: true, index: true },
    factoryId: { type: String, default: 'FACTORY_01', index: true },
  },
  temperature: { type: Number },
  pressure: { type: Number },
  humidity: { type: Number },
}, {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'seconds',
  },
  timestamps: false,
});

export const Telemetry = mongoose.model('Telemetry', telemetrySchema);
