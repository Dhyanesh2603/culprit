'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Rocket,
  AlertTriangle,
  History,
  FolderGit2,
  Users,
  Settings,
  Flame,
  FlaskConical,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProject } from '../../context/ProjectContext';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Demo Lab', href: '/demo', icon: FlaskConical },
  { label: 'Deployments', href: '/deployments', icon: Rocket },
  { label: 'Incidents', href: '/incidents', icon: AlertTriangle },
  { label: 'Timeline', href: '/timeline', icon: History },
  { label: 'Projects', href: '/projects', icon: FolderGit2 },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { activeProject } = useProject();

  return (
    <aside className="w-56 flex-shrink-0 border-r border-border bg-surface flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-border">
          <div className="w-6 h-6 rounded bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div className="leading-tight">
            <span className="font-mono text-xs font-bold tracking-tight text-primary block">
              WHO BROKE THE BUILD?
            </span>
            <span className="text-[10px] font-mono text-primary-subtle block">
              INCIDENT INTELLIGENCE
            </span>
          </div>
        </div>

        {/* Active Project context pill */}
        {activeProject && (
          <div className="px-3 pt-3 pb-1">
            <div className="px-2.5 py-1.5 rounded bg-surface-muted/50 border border-border flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-primary truncate max-w-[140px]">
                {activeProject.name}
              </span>
              <span className="text-[10px] font-mono uppercase text-accent font-semibold px-1 py-0.2 rounded bg-accent/10">
                {activeProject.environment.slice(0, 4)}
              </span>
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="p-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors duration-100',
                  isActive
                    ? 'bg-surface-elevated text-primary border border-border font-semibold shadow-subtle'
                    : 'text-primary-subtle hover:text-primary hover:bg-surface-hover'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4',
                    isActive ? 'text-accent' : 'text-primary-subtle'
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>v1.0.0</span>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-muted border border-border text-[10px]">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-muted border border-border text-[10px]">
              K
            </kbd>
          </div>
        </div>
      </div>
    </aside>
  );
}
