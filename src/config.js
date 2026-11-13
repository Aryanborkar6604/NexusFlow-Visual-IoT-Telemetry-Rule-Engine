import 'dotenv/config';

const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
  return value;
};

export const config = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/nexusflow',
  mongoDb: process.env.MONGODB_DB ?? 'nexusflow',
  bucketSeconds: numberFromEnv('TIMESERIES_BUCKET_SECONDS', 3600),
  batchSize: numberFromEnv('TELEMETRY_BATCH_SIZE', 500),
  flushMs: numberFromEnv('TELEMETRY_FLUSH_MS', 100),
  maxBatch: numberFromEnv('MAX_TELEMETRY_BATCH', 1000),
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173',
};
