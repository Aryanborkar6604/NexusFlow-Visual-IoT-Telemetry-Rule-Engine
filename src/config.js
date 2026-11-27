import 'dotenv/config';

const port = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'replace-with-a-long-random-secret') {
  throw new Error('Set JWT_SECRET to a random value of at least 32 characters');
}

export const config = Object.freeze({
  port,
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/nexusflow',
  mongoDb: process.env.MONGODB_DB ?? 'nexusflow',
  jwtSecret: process.env.JWT_SECRET,
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173',
  maxTelemetryBatch: Number(process.env.MAX_TELEMETRY_BATCH ?? 1000),
  maxWebSocketClients: Number(process.env.MAX_PENDING_WEBSOCKETS ?? 1000),
});
