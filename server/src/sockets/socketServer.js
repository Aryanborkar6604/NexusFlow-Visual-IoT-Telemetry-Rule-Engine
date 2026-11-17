import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export class SocketServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      perMessageDeflate: {
        threshold: 1024, // Only compress payloads over 1KB
      },
      pingTimeout: 20000,
      pingInterval: 10000,
    });

    this.setupMiddleware();
    this.setupEvents();
  }

  setupMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        socket.user = {
          userId: 'demo_user',
          factoryId: ENV.DEFAULT_FACTORY_ID,
          role: 'manager',
        };
        return next();
      }

      try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        socket.user = {
          userId: 'demo_user',
          factoryId: ENV.DEFAULT_FACTORY_ID,
          role: 'manager',
        };
        next();
      }
    });
  }

  setupEvents() {
    this.io.on('connection', (socket) => {
      const factoryId = socket.user?.factoryId || ENV.DEFAULT_FACTORY_ID;
      const factoryRoom = `factory:${factoryId}`;
      socket.join(factoryRoom);

      socket.on('subscribe:workflow', ({ workflowId }) => {
        if (workflowId) {
          const room = `workflow:${workflowId}`;
          socket.join(room);
        }
      });

      socket.on('unsubscribe:workflow', ({ workflowId }) => {
        if (workflowId) {
          const room = `workflow:${workflowId}`;
          socket.leave(room);
        }
      });
    });
  }

  emitToFactory(factoryId, event, data) {
    if (event === 'telemetry:update') {
      // Use volatile emission for high-frequency telemetry to avoid server buffering on slow clients
      this.io.to(`factory:${factoryId}`).volatile.emit(event, data);
    } else {
      this.io.to(`factory:${factoryId}`).emit(event, data);
    }
  }

  emitToWorkflow(workflowId, event, data) {
    if (event === 'workflow:nodeStatus') {
      this.io.to(`workflow:${workflowId}`).volatile.emit(event, data);
    } else {
      this.io.to(`workflow:${workflowId}`).emit(event, data);
    }
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }
}
