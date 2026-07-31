import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';

import { EmergencyAlertModal } from '@/components/EmergencyAlertModal';
import { HelpOnTheWayModal } from '@/components/HelpOnTheWayModal';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useVolunteer } from '@/context/VolunteerContext';
import { api } from '@/lib/api';
import {
  loadDismissedEmergencyIds,
  persistDismissedEmergencyId,
} from '@/lib/emergencyDismissals';
import { getErrorMessage } from '@/lib/errors';
import { getCurrentCoordinates } from '@/lib/location';
import { presentLocalHelpOnWayNotification } from '@/lib/pushNotifications';
import { normalizeVolunteerName } from '@/lib/volunteerName';
import type { EmergencyAlert } from '@/types/database';
import { townAlert } from '@/context/TownAlertContext';

const POLL_MS = 5_000;
const LOCATION_PUSH_MS = 8_000;
const GENERIC_RESPONDER_NAMES = new Set(['town admin', 'admin', 'volunteer', 'citizen']);

function resolveResponderDisplayName(parts: {
  newsletterName?: string | null;
  profileName?: string | null;
  adminName?: string | null;
}) {
  for (const candidate of [parts.newsletterName, parts.profileName, parts.adminName]) {
    const name = normalizeVolunteerName(candidate);
    if (!name) continue;
    if (GENERIC_RESPONDER_NAMES.has(name.toLowerCase())) continue;
    return name;
  }
  return 'Volunteer';
}

type PeerContact = {
  alertId: string;
  peerName: string;
  peerPhone: string | null;
  role: 'requester' | 'responder';
};

type EmergencyAlertContextValue = {
  refreshAlerts: () => Promise<void>;
  /** Active SOS this user is part of (as requester or assigned helper). */
  trackingAlert: EmergencyAlert | null;
  openSosTracking: (alertId: string) => void;
};

const EmergencyAlertContext = createContext<EmergencyAlertContextValue | null>(null);

export function EmergencyAlertProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { guestId, newsletter, profile, loading: volunteerLoading } = useVolunteer();
  const { admin } = useAdminAuth();
  const [alert, setAlert] = useState<EmergencyAlert | null>(null);
  const [visible, setVisible] = useState(false);
  const [responding, setResponding] = useState(false);
  const [dismissalsReady, setDismissalsReady] = useState(false);
  const [peerContact, setPeerContact] = useState<PeerContact | null>(null);
  const [trackingAlert, setTrackingAlert] = useState<EmergencyAlert | null>(null);
  const [activeResponseAlertId, setActiveResponseAlertId] = useState<string | null>(null);
  const dismissedIds = useRef(new Set<string>());
  const notifiedOwnResponseIds = useRef(new Set<string>());

  const canReceiveAlerts = Boolean(newsletter || admin) && !volunteerLoading;
  const responderName = resolveResponderDisplayName({
    newsletterName: newsletter?.full_name,
    profileName: profile?.full_name,
    adminName: admin?.full_name,
  });

  const openSosTracking = useCallback(
    (alertId: string) => {
      router.push(`/sos/${alertId}`);
    },
    [router]
  );

  useEffect(() => {
    let cancelled = false;
    setDismissalsReady(false);

    if (!guestId) {
      dismissedIds.current = new Set();
      setDismissalsReady(true);
      return undefined;
    }

    loadDismissedEmergencyIds(guestId).then((ids) => {
      if (cancelled) return;
      dismissedIds.current = ids;
      setDismissalsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [guestId]);

  const markDismissed = useCallback(
    async (alertId: string) => {
      dismissedIds.current.add(alertId);
      if (guestId) {
        await persistDismissedEmergencyId(guestId, alertId);
      }
    },
    [guestId]
  );

  const pickAlert = useCallback(
    (alerts: EmergencyAlert[]) => {
      return alerts.find(
        (item) =>
          item.guest_id !== guestId &&
          !dismissedIds.current.has(item.id) &&
          item.status === 'active'
      );
    },
    [guestId]
  );

  const refreshAlerts = useCallback(async () => {
    if (!guestId || !dismissalsReady) return;

    try {
      const alerts = await api.listActiveEmergencyAlerts(guestId);

      if (canReceiveAlerts) {
        const next = pickAlert(alerts);
        if (next) {
          setAlert(next);
          setVisible(true);
        } else {
          setVisible(false);
          setAlert(null);
        }
      }

      const ownRequest = alerts.find(
        (item) =>
          item.guest_id === guestId &&
          (item.status === 'active' || item.status === 'responding')
      );

      const mineResponding = alerts.find(
        (item) => item.responded_by_guest_id === guestId && item.status === 'responding'
      );

      // Prefer the SOS this user is actively helping on; otherwise their own request.
      const partyAlert = mineResponding ?? ownRequest ?? null;
      setTrackingAlert(partyAlert);
      setActiveResponseAlertId(mineResponding?.id ?? null);

      if (
        ownRequest &&
        ownRequest.status === 'responding' &&
        ownRequest.responded_by_name &&
        !notifiedOwnResponseIds.current.has(ownRequest.id)
      ) {
        notifiedOwnResponseIds.current.add(ownRequest.id);
        const name = ownRequest.responded_by_name || 'A volunteer';
        setPeerContact({
          alertId: ownRequest.id,
          peerName: name,
          peerPhone: ownRequest.responder_phone,
          role: 'requester',
        });
        void presentLocalHelpOnWayNotification({
          alertId: ownRequest.id,
          responderName: name,
        });
      }
    } catch {
      // Ignore polling errors silently.
    }
  }, [canReceiveAlerts, dismissalsReady, guestId, pickAlert]);

  useEffect(() => {
    if (!guestId || !dismissalsReady) return undefined;

    refreshAlerts();
    const interval = setInterval(refreshAlerts, POLL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshAlerts();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [dismissalsReady, guestId, refreshAlerts]);

  useEffect(() => {
    if (!guestId || !activeResponseAlertId) return undefined;

    let cancelled = false;

    const pushLocation = async () => {
      const here = await getCurrentCoordinates();
      if (cancelled || !here) return;
      try {
        await api.updateEmergencyResponderLocation(activeResponseAlertId, guestId, here);
      } catch {
        // Best-effort live share.
      }
    };

    pushLocation();
    const interval = setInterval(pushLocation, LOCATION_PUSH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeResponseAlertId, guestId]);

  const dismiss = useCallback(() => {
    if (alert) void markDismissed(alert.id);
    setVisible(false);
    setAlert(null);
  }, [alert, markDismissed]);

  const respond = useCallback(
    async (phone: string) => {
      if (!alert || !guestId) return;

      setResponding(true);
      try {
        const here = await getCurrentCoordinates();
        const updated = await api.respondToEmergencyAlert(
          alert.id,
          guestId,
          responderName,
          phone,
          here
        );
        await markDismissed(alert.id);
        setVisible(false);
        setAlert(null);
        setTrackingAlert(updated);
        setActiveResponseAlertId(updated.id);
        setPeerContact({
          alertId: updated.id,
          peerName: updated.citizen_name,
          peerPhone: updated.citizen_phone,
          role: 'responder',
        });
      } catch (error) {
        townAlert('Could not respond', getErrorMessage(error));
      } finally {
        setResponding(false);
      }
    },
    [alert, guestId, markDismissed, responderName]
  );

  const resolve = useCallback(async () => {
    if (!alert) return;

    await api.resolveEmergencyAlert(alert.id);
    await markDismissed(alert.id);
    setVisible(false);
    setAlert(null);
  }, [alert, markDismissed]);

  const dismissPeerContact = useCallback(() => {
    if (peerContact) {
      notifiedOwnResponseIds.current.add(peerContact.alertId);
    }
    setPeerContact(null);
  }, [peerContact]);

  const openTrackingFromModal = useCallback(() => {
    if (!peerContact) return;
    const alertId = peerContact.alertId;
    setPeerContact(null);
    openSosTracking(alertId);
  }, [openSosTracking, peerContact]);

  const value = useMemo(
    () => ({ refreshAlerts, trackingAlert, openSosTracking }),
    [openSosTracking, refreshAlerts, trackingAlert]
  );

  const peerModal =
    peerContact?.role === 'requester'
      ? {
          kicker: 'HELP IS COMING',
          title: `${peerContact.peerName} is on the way`,
          body: 'Open live tracking to see their location and phone number until this SOS is resolved.',
        }
      : {
          kicker: 'YOU ARE RESPONDING',
          title: `Helping ${peerContact?.peerName ?? 'the requester'}`,
          body: 'Open live tracking to share your location and see the requester’s phone until this SOS is resolved.',
        };

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
        canSeeCitizenPhone={Boolean(
          alert && guestId && alert.responded_by_guest_id === guestId && alert.citizen_phone
        )}
      />
      <HelpOnTheWayModal
        visible={Boolean(peerContact)}
        kicker={peerModal.kicker}
        title={peerModal.title}
        body={peerModal.body}
        peerName={peerContact?.peerName ?? 'Volunteer'}
        peerPhone={null}
        showTrackingMap={false}
        primaryActionLabel="Open live tracking"
        onPrimaryAction={openTrackingFromModal}
        onDismiss={dismissPeerContact}
      />
    </EmergencyAlertContext.Provider>
  );
}

export function useEmergencyAlerts() {
  const context = useContext(EmergencyAlertContext);
  if (!context) throw new Error('useEmergencyAlerts must be used within EmergencyAlertProvider');
  return context;
}
