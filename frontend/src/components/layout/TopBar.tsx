'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Search,
  Bell,
  ShieldCheck,
  UserCheck,
  Eye,
  Check,
  FolderGit2,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Badge } from '../ui/Badge';
import { NotificationDrawer } from './NotificationDrawer';
import { UserRole } from '../../types';

interface TopBarProps {
  onOpenCommandPalette: () => void;
}

export function TopBar({ onOpenCommandPalette }: TopBarProps) {
  const { projects, activeProject, setActiveProject } = useProject();
  const { user, role, switchRole } = useAuth();
  const { notifications } = useSocket();

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

  const roles: { id: UserRole; label: string; icon: any }[] = [
    { id: 'ADMIN', label: 'Admin (Full Access)', icon: ShieldCheck },
    { id: 'DEVELOPER', label: 'Developer (Deploy & Incidents)', icon: UserCheck },
    { id: 'VIEWER', label: 'Viewer (Read-Only)', icon: Eye },
  ];

  return (
    <>
      <header className="h-14 border-b border-border bg-surface px-4 md:px-6 flex items-center justify-between select-none z-20 gap-3">
        {/* Left: Project Selector, Monitor Repo, Search */}
        <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
          {/* Project Selector Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => {
                setProjectDropdownOpen(!projectDropdownOpen);
                setRoleDropdownOpen(false);
              }}
              className="h-8 flex items-center gap-2 px-2.5 md:px-3 rounded border border-border bg-surface-elevated hover:bg-surface-hover hover:border-border-focus text-xs font-mono font-medium transition-colors whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
              <span className="text-primary truncate max-w-[140px] md:max-w-[180px]">
                {activeProject ? activeProject.name : 'Select Project'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-primary-subtle flex-shrink-0" />
            </button>

            {projectDropdownOpen && (
              <div className="absolute left-0 mt-1 w-64 rounded-md border border-border bg-surface-elevated p-1 shadow-modal z-30 animate-fade-in text-xs font-mono">
                <div className="px-2 py-1.5 text-[10px] uppercase text-zinc-500 font-semibold tracking-wider">
                  Switch Project
                </div>
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setActiveProject(proj);
                      setProjectDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-surface-hover flex items-center justify-between transition-colors"
                  >
                    <span className="truncate">{proj.name}</span>
                    {activeProject?.id === proj.id && (
                      <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Connect Repo Button */}
          <Link
            href="/projects?connect=true"
            className="h-8 hidden sm:inline-flex items-center gap-1.5 px-2.5 rounded border border-border bg-surface-elevated hover:bg-surface-hover hover:border-accent text-xs font-mono text-primary transition-colors whitespace-nowrap flex-shrink-0"
            title="Connect any GitHub repository to monitor"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span className="whitespace-nowrap font-medium">+ Monitor Repo</span>
          </Link>

          {/* Quick Global Search / Command Menu Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="h-8 flex items-center gap-2 px-3 rounded border border-border/70 bg-surface-muted/40 hover:bg-surface-muted hover:border-border text-xs text-primary-subtle transition-colors w-48 md:w-56 lg:w-64 justify-between flex-shrink-0"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Search or jump...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono flex-shrink-0">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Notifications, Role Switcher (LIVE badge removed) */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {/* Notification Bell Button */}
          <button
            onClick={() => setNotificationDrawerOpen(true)}
            className="h-8 w-8 rounded border border-border bg-surface-elevated hover:bg-surface-hover text-primary-subtle hover:text-primary transition-colors flex items-center justify-center relative flex-shrink-0"
            title="Real-time Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-background font-mono text-[9px] font-bold flex items-center justify-center">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {/* User Profile & Role Switcher */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => {
                setRoleDropdownOpen(!roleDropdownOpen);
                setProjectDropdownOpen(false);
              }}
              className="h-8 flex items-center gap-2 px-2.5 rounded border border-border bg-surface-elevated hover:bg-surface-hover transition-colors whitespace-nowrap"
            >
              <div className="w-5 h-5 rounded-full bg-surface-muted border border-border flex items-center justify-center text-[10px] font-mono font-bold text-primary flex-shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <span className="text-xs text-primary font-medium max-w-[110px] md:max-w-[140px] truncate">
                {user?.name || 'Engineer'}
              </span>
              <Badge role={role}>{role}</Badge>
              <ChevronDown className="w-3.5 h-3.5 text-primary-subtle flex-shrink-0" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 rounded-md border border-border bg-surface-elevated p-1.5 shadow-modal z-30 animate-fade-in text-xs">
                <div className="px-2 py-1 text-[10px] font-mono uppercase text-zinc-500 font-semibold border-b border-border/70 mb-1">
                  Active User Role (Simulate RBAC)
                </div>
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isCurrent = role === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        switchRole(r.id);
                        setRoleDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded hover:bg-surface-hover flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary-subtle flex-shrink-0" />
                        <span className={isCurrent ? 'font-semibold text-primary' : 'text-primary-subtle'}>
                          {r.label}
                        </span>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notification Slide Drawer */}
      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
      />
    </>
  );
}
