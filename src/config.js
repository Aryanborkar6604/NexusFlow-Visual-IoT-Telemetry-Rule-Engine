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
  jwtSecret: process.env.JWT_SECRET ?? 'local-development-secret-change-before-deploying',
  bucketSeconds: numberFromEnv('TIMESERIES_BUCKET_SECONDS', 3600),
  batchSize: numberFromEnv('TELEMETRY_BATCH_SIZE', 500),
  flushMs: numberFromEnv('TELEMETRY_FLUSH_MS', 100),
  maxBatch: numberFromEnv('MAX_TELEMETRY_BATCH', 1000),
  maxPendingTelemetry: numberFromEnv('MAX_PENDING_TELEMETRY', 10000),
  maxWebSocketClients: numberFromEnv('MAX_WEBSOCKET_CLIENTS', 5000),
  maxWebSocketBufferedBytes: numberFromEnv('MAX_WEBSOCKET_BUFFERED_BYTES', 1024 * 1024),
  mongoMaxPoolSize: numberFromEnv('MONGODB_MAX_POOL_SIZE', 100),
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173',
};
