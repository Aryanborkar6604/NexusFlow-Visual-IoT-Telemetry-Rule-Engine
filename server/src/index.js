import express from 'express';
import http from 'http';
import cors from 'cors';
import compression from 'compression';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import { SocketServer } from './sockets/socketServer.js';
import { pipelineManager } from './compiler/pipelineManager.js';
import { alertEngine } from './alerts/alertEngine.js';
import { setTelemetrySocketServer } from './controllers/telemetryController.js';
import { setAlertSocketServer } from './controllers/alertController.js';
import { setDeviceSocketServer } from './controllers/deviceController.js';
import { simulator } from './simulator/telemetrySimulator.js';
import { flushTelemetryBatch } from './ingestion/ingestionService.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import telemetryRoutes from './routes/telemetryRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import alertRoutes from './routes/alertRoutes.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket Server
const socketServer = new SocketServer(server);

// Bind dependencies to Socket Server
pipelineManager.setSocketServer(socketServer);
alertEngine.setSocketServer(socketServer);
setTelemetrySocketServer(socketServer);
setAlertSocketServer(socketServer);
setDeviceSocketServer(socketServer);
simulator.setSocketServer(socketServer);

// Global High-Performance Middleware
app.use(cors({ origin: '*' }));
app.use(compression()); // Gzip/Deflate compression for fast payload delivery
app.use(express.json({ limit: '1mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/alerts', alertRoutes);

// Health check with memory metrics
app.get('/api/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    activeWorkflows: pipelineManager.getActiveWorkflowIds(),
    uptime: Math.round(process.uptime()),
    memory: {
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    },
  });
});

// Graceful shutdown handling
const handleGracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Flushing pending telemetry buffer...`);
  await flushTelemetryBatch();
  server.close(() => {
    console.log('[Server] HTTP and WebSocket listeners closed cleanly.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

// Startup sequence
async function startServer() {
  await connectDB();

  server.listen(ENV.PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 NexusFlow Server running on port ${ENV.PORT}`);
    console.log(`📡 Ingestion endpoint: http://localhost:${ENV.PORT}/api/telemetry`);
    console.log(`⚡ Socket.IO real-time layer active (Volatile Telemetry Stream)`);
    console.log(`💾 High-performance MongoDB micro-batch queue enabled`);
    console.log(`=================================================\n`);

    // Start background telemetry simulator for out-of-the-box demo data
    simulator.start(1500);
  });
}

startServer();
