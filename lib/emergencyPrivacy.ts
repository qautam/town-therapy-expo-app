import type { EmergencyAlert } from '@/types/database';

/** Private SOS fields are only visible to the requester and the assigned responder. */
export function redactEmergencyPhones(
  alert: EmergencyAlert,
  viewerGuestId: string | null | undefined
): EmergencyAlert {
  const isCitizen = Boolean(viewerGuestId && alert.guest_id === viewerGuestId);
  const isResponder = Boolean(viewerGuestId && alert.responded_by_guest_id === viewerGuestId);

  if (isCitizen || isResponder) return alert;

  return {
    ...alert,
    citizen_phone: null,
    responder_phone: null,
    responder_latitude: null,
    responder_longitude: null,
    responder_location_updated_at: null,
  };
}

export function redactEmergencyPhoneList(
  alerts: EmergencyAlert[],
  viewerGuestId: string | null | undefined
) {
  return alerts.map((alert) => redactEmergencyPhones(alert, viewerGuestId));
}
