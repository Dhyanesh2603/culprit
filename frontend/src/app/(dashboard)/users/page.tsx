'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users as UsersIcon, ShieldCheck, UserCheck, Eye } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { apiRequest } from '../../../lib/api';
import { User, UserRole } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import { formatDate } from '../../../lib/utils';

export default function UsersPage() {
  const { role: currentUserRole } = useAuth();

  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => apiRequest<User[]>('/users'),
  });

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await apiRequest(`/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-primary font-mono uppercase">
            Team Members & Access Control
          </h1>
          <p className="text-xs text-primary-subtle mt-0.5">
            Role-Based Access Control (Admin, Developer, Viewer) across projects and incident war rooms.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <Table>
        <TableHeader>
          <tr>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Assigned Incidents</TableHead>
            <TableHead>Created Incidents</TableHead>
            <TableHead>Joined At</TableHead>
            {currentUserRole === 'ADMIN' && <TableHead className="text-right">Manage Role</TableHead>}
          </tr>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <tr>
              <TableCell colSpan={7} className="text-center py-10 text-primary-subtle">
                Loading team directory...
              </TableCell>
            </tr>
          ) : (
            users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-surface-muted border border-border flex items-center justify-center font-mono text-xs font-bold text-primary">
                      {u.name ? u.name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="font-semibold text-primary">{u.name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-primary-subtle">
                  {u.email}
                </TableCell>
                <TableCell>
                  <Badge role={u.role}>{u.role}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {u._count?.assignments || 0}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {u._count?.createdIncidents || 0}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-zinc-500">
                  {u.createdAt ? formatDate(u.createdAt) : '-'}
                </TableCell>
                {currentUserRole === 'ADMIN' && (
                  <TableCell className="text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className="bg-surface-muted border border-border text-xs rounded px-2 py-1 text-primary focus:outline-none"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="DEVELOPER">DEVELOPER</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
