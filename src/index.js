import { config } from './config.js';
import { createServer } from './server.js';

const app = await createServer();
app.server.listen(config.port, () => console.info(`NexusFlow backend listening on port ${config.port}`));

async function shutdown(signal) {
  console.info(`${signal} received; shutting down`);
  app.server.close(async () => { await app.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
