'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Radio, RefreshCw } from 'lucide-react';
import { useProject } from '../../../context/ProjectContext';
import { useSocket } from '../../../context/SocketContext';
import { apiRequest } from '../../../lib/api';
import { TimelineEvent } from '../../../types';
import { TimelineFeed } from '../../../components/timeline/TimelineFeed';
import { Button } from '../../../components/ui/Button';

export default function TimelinePage() {
  const { activeProject } = useProject();
  const { socket } = useSocket();

  const { data: events = [], isLoading, refetch } = useQuery<TimelineEvent[]>({
    queryKey: ['timeline', activeProject?.id],
    queryFn: () => {
      const url = activeProject
        ? `/timeline/project/${activeProject.id}?order=desc&limit=100`
        : '/timeline/unified?order=desc&limit=100';
      return apiRequest<TimelineEvent[]>(url);
    },
    enabled: true,
  });

  // Re-fetch when live timeline events arrive via Socket.IO
  useEffect(() => {
    if (socket) {
      const handleTimelineUpdate = () => {
        refetch();
      };
      socket.on('timeline:event', handleTimelineUpdate);
      return () => {
        socket.off('timeline:event', handleTimelineUpdate);
      };
    }
  }, [socket, refetch]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-primary font-mono uppercase">
              Unified Chronological Stream
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE INGESTION</span>
            </span>
          </div>
          <p className="text-xs text-primary-subtle mt-0.5">
            Every deployment, commit, incident, status change, and comment ordered strictly by Occurred At timestamp.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          <span>Refresh Stream</span>
        </Button>
      </div>

      {/* Main Timeline Stream */}
      <TimelineFeed events={events} isLoading={isLoading} />
    </div>
  );
}
