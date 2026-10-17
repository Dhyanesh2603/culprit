'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  GitCommit,
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  UserPlus,
  RotateCcw,
  Clock,
  Search,
  Filter,
} from 'lucide-react';
import { TimelineEvent, TimelineEventType } from '../../types';
import { formatDate, formatRelativeTime } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/FormControls';

interface TimelineFeedProps {
  events: TimelineEvent[];
  isLoading?: boolean;
}

const EVENT_ICONS: Record<TimelineEventType, any> = {
  DEPLOYMENT: Rocket,
  COMMIT: GitCommit,
  INCIDENT_CREATED: AlertTriangle,
  INCIDENT_STATUS_CHANGE: AlertTriangle,
  ASSIGNMENT: UserPlus,
  RESOLUTION: CheckCircle,
  COMMENT: MessageSquare,
  ROLLBACK: RotateCcw,
};

export function TimelineFeed({ events, isLoading }: TimelineFeedProps) {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events.filter((e) => {
    if (filterType !== 'ALL' && e.eventType !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchDesc = (e.description || '').toLowerCase().includes(q);
      const matchActor = (e.actorName || '').toLowerCase().includes(q);
      return matchTitle || matchDesc || matchActor;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'DEPLOYMENT', label: 'Deployments' },
            { id: 'COMMIT', label: 'Commits' },
            { id: 'INCIDENT_CREATED', label: 'Incidents' },
            { id: 'COMMENT', label: 'Comments' },
            { id: 'ROLLBACK', label: 'Rollbacks' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium whitespace-nowrap transition-colors ${
                filterType === tab.id
                  ? 'bg-surface-elevated text-primary border border-border shadow-subtle'
                  : 'text-primary-subtle hover:text-primary hover:bg-surface-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-56">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter timeline events..."
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Events Stream */}
      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-border">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center rounded border border-border bg-surface text-xs text-primary-subtle">
            {isLoading ? 'Loading timeline stream...' : 'No events match the current filter criteria.'}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredEvents.map((event) => {
              const Icon = EVENT_ICONS[event.eventType] || Clock;

              // Parse metadata to check late arrival
              let isLate = false;
              if (event.metadata) {
                try {
                  const meta = JSON.parse(event.metadata);
                  isLate = !!meta.isLateArriving;
                } catch {}
              }

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="relative group"
                >
                  {/* Timeline Node Point */}
                  <div
                    className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border border-border bg-surface-elevated flex items-center justify-center text-primary-subtle group-hover:border-accent group-hover:text-accent transition-colors`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                  </div>

                  {/* Event Card */}
                  <div className="p-3.5 rounded border border-border bg-surface hover:border-border-focus transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">
                          {event.title}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-surface-muted text-primary-subtle border border-border">
                          {event.eventType}
                        </span>
                        {isLate && (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/40 text-amber-400 border border-amber-900/40"
                            title={`Occurred: ${formatDate(event.occurredAt)}, Ingested: ${formatDate(event.receivedAt)}`}
                          >
                            LATE INGESTION
                          </span>
                        )}
                      </div>

                      {/* Timestamps: Occurred At is canonical */}
                      <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                        <span title={`Ingested: ${formatDate(event.receivedAt)}`}>
                          Occurred: {formatDate(event.occurredAt)} ({formatRelativeTime(event.occurredAt)})
                        </span>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-xs text-primary-subtle mt-1 font-sans">
                        {event.description}
                      </p>
                    )}

                    {event.actorName && (
                      <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                        <span>Actor: {event.actorName} {event.actorEmail ? `(${event.actorEmail})` : ''}</span>
                        {event.incident && (
                          <span className="text-accent">
                            Linked to Incident #{event.incident.incidentNumber}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
