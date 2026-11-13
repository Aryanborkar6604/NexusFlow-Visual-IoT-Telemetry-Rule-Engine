import express from 'express';
import http from 'http';
import cors from 'cors';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import { SocketServer } from './sockets/socketServer.js';
import { pipelineManager } from './compiler/pipelineManager.js';
import { alertEngine } from './alerts/alertEngine.js';
import { setTelemetrySocketServer } from './controllers/telemetryController.js';
import { setAlertSocketServer } from './controllers/alertController.js';
import { simulator } from './simulator/telemetrySimulator.js';

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
simulator.setSocketServer(socketServer);

// Global Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/alerts', alertRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeWorkflows: pipelineManager.getActiveWorkflowIds(),
    uptime: process.uptime(),
  });
});

// Startup sequence
async function startServer() {
  await connectDB();

  server.listen(ENV.PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 NexusFlow Server running on port ${ENV.PORT}`);
    console.log(`📡 Ingestion endpoint: http://localhost:${ENV.PORT}/api/telemetry`);
    console.log(`⚡ Socket.IO real-time layer active`);
    console.log(`=================================================\n`);

    // Start background telemetry simulator for out-of-the-box demo data
    simulator.start(1500);
  });
}

startServer();
