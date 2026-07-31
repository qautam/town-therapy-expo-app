import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  // Don't block first paint — admin session is rare for volunteers
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const session = await api.getAdminSession();
    setAdmin(session.user?.role === 'admin' ? session.user : null);
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    });
    return () => task.cancel();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const profile = await api.adminSignIn(email, password);
    setAdmin(profile);
  }, []);

  const signOut = useCallback(async () => {
    await api.adminSignOut();
    setAdmin(null);
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
