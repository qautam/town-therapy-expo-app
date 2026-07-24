import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { EmergencyAlertModal } from '@/components/EmergencyAlertModal';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useVolunteer } from '@/context/VolunteerContext';
import { api } from '@/lib/api';
import type { EmergencyAlert } from '@/types/database';

const POLL_MS = 8000;

type EmergencyAlertContextValue = {
  refreshAlerts: () => Promise<void>;
};

const EmergencyAlertContext = createContext<EmergencyAlertContextValue | null>(null);

export function EmergencyAlertProvider({ children }: { children: ReactNode }) {
  const { guestId, newsletter, profile, loading: volunteerLoading } = useVolunteer();
  const { admin } = useAdminAuth();
  const [alert, setAlert] = useState<EmergencyAlert | null>(null);
  const [visible, setVisible] = useState(false);
  const [responding, setResponding] = useState(false);
  const dismissedIds = useRef(new Set<string>());
  const shownIds = useRef(new Set<string>());

  const canReceiveAlerts = Boolean(newsletter || admin) && !volunteerLoading;
  const responderName =
    admin?.full_name ?? newsletter?.full_name ?? profile?.full_name ?? 'Volunteer';

  const pickAlert = useCallback(
    (alerts: EmergencyAlert[]) => {
      return alerts.find(
        (item) =>
          item.guest_id !== guestId &&
          !dismissedIds.current.has(item.id) &&
          (item.status === 'active' || item.status === 'responding')
      );
    },
    [guestId]
  );

  const refreshAlerts = useCallback(async () => {
    if (!canReceiveAlerts || !guestId) return;

    try {
      const alerts = await api.listActiveEmergencyAlerts();
      const next = pickAlert(alerts);
      if (!next) return;

      setAlert(next);
      if (!shownIds.current.has(next.id) || next.status === 'active') {
        setVisible(true);
        shownIds.current.add(next.id);
      }
    } catch {
      // Ignore polling errors silently.
    }
  }, [canReceiveAlerts, guestId, pickAlert]);

  useEffect(() => {
    if (!canReceiveAlerts) return undefined;

    refreshAlerts();
    const interval = setInterval(refreshAlerts, POLL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshAlerts();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [canReceiveAlerts, refreshAlerts]);

  const dismiss = useCallback(() => {
    if (alert) dismissedIds.current.add(alert.id);
    setVisible(false);
  }, [alert]);

  const respond = useCallback(async () => {
    if (!alert || !guestId) return;

    setResponding(true);
    try {
      const updated = await api.respondToEmergencyAlert(alert.id, guestId, responderName);
      setAlert(updated);
      dismissedIds.current.add(alert.id);
      setVisible(false);
    } finally {
      setResponding(false);
    }
  }, [alert, guestId, responderName]);

  const resolve = useCallback(async () => {
    if (!alert) return;

    await api.resolveEmergencyAlert(alert.id);
    dismissedIds.current.add(alert.id);
    setVisible(false);
    setAlert(null);
  }, [alert]);

  const value = useMemo(() => ({ refreshAlerts }), [refreshAlerts]);

  return (
    <EmergencyAlertContext.Provider value={value}>
      {children}
      <EmergencyAlertModal
        visible={visible && canReceiveAlerts}
        alert={alert}
        onRespond={respond}
        onDismiss={dismiss}
        onResolve={admin ? resolve : undefined}
        showResolve={Boolean(admin)}
        responding={responding}
      />
    </EmergencyAlertContext.Provider>
  );
}

export function useEmergencyAlerts() {
  const context = useContext(EmergencyAlertContext);
  if (!context) throw new Error('useEmergencyAlerts must be used within EmergencyAlertProvider');
  return context;
}
