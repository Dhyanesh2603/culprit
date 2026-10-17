import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { SOCKET_EVENTS } from './events';

let io: SocketIOServer | null = null;

export function initializeSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allows development from local frontend
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join project room for project-specific streaming
    socket.on(SOCKET_EVENTS.JOIN_PROJECT, (projectId: string) => {
      socket.join(`project:${projectId}`);
      logger.debug(`Socket ${socket.id} joined project room: project:${projectId}`);
    });

    socket.on(SOCKET_EVENTS.LEAVE_PROJECT, (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    // Join incident war-room for live incident discussion & status changes
    socket.on(SOCKET_EVENTS.JOIN_INCIDENT, (incidentId: string) => {
      socket.join(`incident:${incidentId}`);
      logger.debug(`Socket ${socket.id} joined incident room: incident:${incidentId}`);
    });

    socket.on(SOCKET_EVENTS.LEAVE_INCIDENT, (incidentId: string) => {
      socket.leave(`incident:${incidentId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Broadcast event to all connected clients or specific rooms
 */
export function broadcastEvent(event: string, data: any, room?: string) {
  if (!io) {
    logger.warn(`Attempted to emit ${event} before Socket.IO was initialized`);
    return;
  }
  if (room) {
    io.to(room).emit(event, data);
  } else {
    io.emit(event, data);
  }
}
