import { config } from './config.js';
import { connectDatabase } from './db.js';
import { createServer } from './server.js';

await connectDatabase();
const app = await createServer();
app.server.listen(config.port, () => console.info(`NexusFlow API listening on http://localhost:${config.port}`));

let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.info(`${signal} received; shutting down`);
  await app.close();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
