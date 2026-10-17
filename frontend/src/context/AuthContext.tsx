'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiRequest, setApiAuthToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isLoading: boolean;
  switchRole: (newRole: UserRole) => Promise<void>;
  token: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>('dev-token:admin');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage or default to ADMIN
  useEffect(() => {
    const savedRole = (localStorage.getItem('wbtb_role') as UserRole) || 'ADMIN';
    const initialToken = `dev-token:${savedRole.toLowerCase()}`;
    setRole(savedRole);
    setToken(initialToken);
    setApiAuthToken(initialToken);

    // Fetch user profile from backend
    fetchProfile(initialToken, savedRole);
  }, []);

  const fetchProfile = async (authToken: string, currentRole: UserRole) => {
    setIsLoading(true);
    try {
      setApiAuthToken(authToken);
      const profile = await apiRequest<User>('/auth/me');
      setUser(profile);
    } catch {
      // Fallback demo user
      setUser({
        id: `demo-${currentRole.toLowerCase()}`,
        email: `${currentRole.toLowerCase()}@whobrokethebuild.internal`,
        name: `Staff Engineer (${currentRole})`,
        role: currentRole,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (newRole: UserRole) => {
    const newToken = `dev-token:${newRole.toLowerCase()}`;
    setRole(newRole);
    setToken(newToken);
    setApiAuthToken(newToken);
    localStorage.setItem('wbtb_role', newRole);

    try {
      await apiRequest('/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({ role: newRole }),
      });
    } catch {
      // Non-blocking in dev
    }

    await fetchProfile(newToken, newRole);
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, switchRole, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
