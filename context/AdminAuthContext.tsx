import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { InteractionManager } from 'react-native';

import { api } from '@/lib/api';
import type { Profile } from '@/types/database';

type AdminAuthContextValue = {
  admin: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const generationRef = useRef(0);

  const applyAdmin = useCallback((generation: number, profile: Profile | null) => {
    if (generation !== generationRef.current) return;
    setAdmin(profile?.role === 'admin' ? profile : null);
  }, []);

  const refresh = useCallback(async () => {
    const generation = generationRef.current;
    const session = await api.getAdminSession();
    applyAdmin(generation, session.user);
  }, [applyAdmin]);

  useEffect(() => {
    const startedGeneration = generationRef.current;
    const task = InteractionManager.runAfterInteractions(() => {
      refresh().finally(() => {
        if (startedGeneration === generationRef.current) setLoading(false);
      });
    });
    return () => task.cancel();
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const generation = ++generationRef.current;
      const profile = await api.adminSignIn(email, password);
      applyAdmin(generation, profile);
      setLoading(false);
    },
    [applyAdmin]
  );

  const signOut = useCallback(async () => {
    generationRef.current += 1;
    await api.adminSignOut();
    setAdmin(null);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({ admin, loading, signIn, signOut, refresh }),
    [admin, loading, signIn, signOut, refresh]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
}
