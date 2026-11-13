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
    });

    this.setupMiddleware();
    this.setupEvents();
  }

  setupMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        // Fallback for easy dev/demo mode
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
        // Still allow demo fallback
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

      console.log(`[Socket.IO] Client connected: ${socket.id} (joined ${factoryRoom})`);

      socket.on('subscribe:workflow', ({ workflowId }) => {
        if (workflowId) {
          const room = `workflow:${workflowId}`;
          socket.join(room);
          console.log(`[Socket.IO] Client ${socket.id} joined ${room}`);
        }
      });

      socket.on('unsubscribe:workflow', ({ workflowId }) => {
        if (workflowId) {
          const room = `workflow:${workflowId}`;
          socket.leave(room);
          console.log(`[Socket.IO] Client ${socket.id} left ${room}`);
        }
      });

      socket.on('disconnect', () => {
        console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      });
    });
  }

  emitToFactory(factoryId, event, data) {
    this.io.to(`factory:${factoryId}`).emit(event, data);
  }

  emitToWorkflow(workflowId, event, data) {
    this.io.to(`workflow:${workflowId}`).emit(event, data);
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }
}
