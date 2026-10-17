'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Trash2, CheckCircle2 } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { formatRelativeTime } from '../../lib/utils';
import { Button } from '../ui/Button';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { notifications, clearNotifications } = useSocket();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-96 h-full bg-surface-elevated border-l border-border shadow-modal flex flex-col text-primary"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-semibold uppercase tracking-wider font-mono">
                  Real-time Notifications ({notifications.length})
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearNotifications}
                    title="Clear all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-primary-subtle hover:text-red-400" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notifications.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-4">
                  <CheckCircle2 className="w-8 h-8 text-primary-dark mb-2" />
                  <p className="text-xs text-primary-subtle">All caught up</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Live events from deployments, commits, and incidents will stream here via Socket.IO
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded border border-border bg-surface hover:border-border-focus transition-colors text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">{item.title}</span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-primary-subtle line-clamp-2">{item.message}</p>
                    <span className="inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-muted text-accent">
                      {item.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
