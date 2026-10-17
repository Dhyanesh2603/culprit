'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useProject } from './ProjectContext';
import { TimelineEvent } from '../types';

interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: RealtimeNotification[];
  clearNotifications: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:5001';
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const { activeProject } = useProject();

  useEffect(() => {
    const socketInstance = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for live timeline events
    socketInstance.on('timeline:event', (event: TimelineEvent) => {
      setNotifications((prev) => [
        {
          id: event.id || String(Date.now()),
          title: event.title,
          message: event.description || `Event type: ${event.eventType}`,
          timestamp: new Date().toISOString(),
          type: event.eventType,
        },
        ...prev.slice(0, 29), // Keep latest 30
      ]);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Join active project room whenever activeProject changes
  useEffect(() => {
    if (socket && isConnected && activeProject) {
      socket.emit('project:join', activeProject.id);
      return () => {
        socket.emit('project:leave', activeProject.id);
      };
    }
  }, [socket, isConnected, activeProject]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        clearNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
}
