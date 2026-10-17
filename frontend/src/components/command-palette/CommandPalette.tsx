'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Rocket,
  AlertTriangle,
  History,
  FolderGit2,
  Users,
  Settings,
  PlusCircle,
  ShieldCheck,
  UserCheck,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateIncident?: () => void;
  onOpenRecordDeployment?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenCreateIncident,
  onOpenRecordDeployment,
}: CommandPaletteProps) {
  const router = useRouter();
  const { switchRole } = useAuth();
  const { projects, setActiveProject } = useProject();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items = [
    // Navigation
    {
      group: 'Navigation',
      label: 'Go to Dashboard',
      icon: LayoutDashboard,
      action: () => router.push('/'),
    },
    {
      group: 'Navigation',
      label: 'Go to Deployments',
      icon: Rocket,
      action: () => router.push('/deployments'),
    },
    {
      group: 'Navigation',
      label: 'Go to Incidents',
      icon: AlertTriangle,
      action: () => router.push('/incidents'),
    },
    {
      group: 'Navigation',
      label: 'Go to Timeline',
      icon: History,
      action: () => router.push('/timeline'),
    },
    {
      group: 'Navigation',
      label: 'Go to Projects',
      icon: FolderGit2,
      action: () => router.push('/projects'),
    },
    {
      group: 'Navigation',
      label: 'Go to Users',
      icon: Users,
      action: () => router.push('/users'),
    },
    {
      group: 'Navigation',
      label: 'Go to Settings',
      icon: Settings,
      action: () => router.push('/settings'),
    },

    // Quick Actions
    ...(onOpenCreateIncident
      ? [
          {
            group: 'Actions',
            label: 'Create New Incident',
            icon: PlusCircle,
            action: onOpenCreateIncident,
          },
        ]
      : []),
    ...(onOpenRecordDeployment
      ? [
          {
            group: 'Actions',
            label: 'Record New Deployment',
            icon: Rocket,
            action: onOpenRecordDeployment,
          },
        ]
      : []),

    // Switch Projects
    ...projects.map((p) => ({
      group: 'Projects',
      label: `Switch to ${p.name}`,
      icon: FolderGit2,
      action: () => setActiveProject(p),
    })),

    // Role Simulation
    {
      group: 'Role Switcher',
      label: 'Simulate Admin Role',
      icon: ShieldCheck,
      action: () => switchRole('ADMIN'),
    },
    {
      group: 'Role Switcher',
      label: 'Simulate Developer Role',
      icon: UserCheck,
      action: () => switchRole('DEVELOPER'),
    },
    {
      group: 'Role Switcher',
      label: 'Simulate Viewer Role',
      icon: Eye,
      action: () => switchRole('VIEWER'),
    },
  ];

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-xl rounded-lg border border-border bg-surface-elevated shadow-modal overflow-hidden text-primary"
          >
            {/* Search Input */}
            <div className="p-3 border-b border-border flex items-center gap-3">
              <Search className="w-4 h-4 text-primary-subtle" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type a command, page name, or action..."
                className="w-full bg-transparent text-sm text-primary placeholder:text-zinc-600 focus:outline-none"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono text-zinc-500">
                ESC
              </kbd>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-primary-subtle">
                  No matching commands found.
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={`${item.group}-${item.label}`}
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-3 py-2 rounded flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? 'bg-surface-muted text-primary font-medium'
                          : 'text-primary-subtle hover:text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-accent' : 'text-primary-subtle'}`} />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600 uppercase">
                        {item.group}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
