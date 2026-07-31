/**
 * SOS contact phones + responder live location travel either in dedicated DB columns
 * (preferred) or, when those columns are missing, as a hidden suffix in `message`.
 * The suffix is always stripped before UI display; private fields are only attached
 * for the requester and assigned responder.
 */

const MARKER = '\n\n⟦TTSOS⟧';

type SosContactMeta = {
  v: 1;
  c?: string | null;
  r?: string | null;
  rlat?: number | null;
  rlng?: number | null;
  rat?: string | null;
};

function encodeMeta(meta: SosContactMeta) {
  const json = JSON.stringify({
    v: 1,
    ...(meta.c ? { c: meta.c } : {}),
    ...(meta.r ? { r: meta.r } : {}),
    ...(typeof meta.rlat === 'number' ? { rlat: meta.rlat } : {}),
    ...(typeof meta.rlng === 'number' ? { rlng: meta.rlng } : {}),
    ...(meta.rat ? { rat: meta.rat } : {}),
  });

  if (typeof btoa === 'function') {
    return btoa(json);
  }

  return Buffer.from(json, 'utf8').toString('base64');
}

function decodeMeta(encoded: string): SosContactMeta | null {
  try {
    const json =
      typeof atob === 'function'
        ? atob(encoded)
        : Buffer.from(encoded, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as SosContactMeta;
    if (!parsed || parsed.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type SosPrivateFields = {
  visibleMessage: string | null;
  citizenPhone: string | null;
  responderPhone: string | null;
  responderLatitude: number | null;
  responderLongitude: number | null;
  responderLocationUpdatedAt: string | null;
  rawMessage: string | null;
};

export function splitSosMessage(message: string | null | undefined): SosPrivateFields {
  const raw = message ?? null;
  if (!raw) {
    return {
      visibleMessage: null,
      citizenPhone: null,
      responderPhone: null,
      responderLatitude: null,
      responderLongitude: null,
      responderLocationUpdatedAt: null,
      rawMessage: null,
    };
  }

  const index = raw.lastIndexOf(MARKER);
  if (index < 0) {
    return {
      visibleMessage: raw,
      citizenPhone: null,
      responderPhone: null,
      responderLatitude: null,
      responderLongitude: null,
      responderLocationUpdatedAt: null,
      rawMessage: raw,
    };
  }

  const visible = raw.slice(0, index).trimEnd();
  const encoded = raw.slice(index + MARKER.length).trim();
  const meta = decodeMeta(encoded);

  return {
    visibleMessage: visible || null,
    citizenPhone: meta?.c ?? null,
    responderPhone: meta?.r ?? null,
    responderLatitude: typeof meta?.rlat === 'number' ? meta.rlat : null,
    responderLongitude: typeof meta?.rlng === 'number' ? meta.rlng : null,
    responderLocationUpdatedAt: meta?.rat ?? null,
    rawMessage: raw,
  };
}

export function buildSosMessage(input: {
  visibleMessage?: string | null;
  citizenPhone?: string | null;
  responderPhone?: string | null;
  responderLatitude?: number | null;
  responderLongitude?: number | null;
  responderLocationUpdatedAt?: string | null;
  previousMessage?: string | null;
}) {
  const previous = splitSosMessage(input.previousMessage);
  const visible =
    input.visibleMessage !== undefined
      ? input.visibleMessage?.trim() || null
      : previous.visibleMessage;
  const citizenPhone =
    input.citizenPhone !== undefined ? input.citizenPhone : previous.citizenPhone;
  const responderPhone =
    input.responderPhone !== undefined ? input.responderPhone : previous.responderPhone;
  const responderLatitude =
    input.responderLatitude !== undefined
      ? input.responderLatitude
      : previous.responderLatitude;
  const responderLongitude =
    input.responderLongitude !== undefined
      ? input.responderLongitude
      : previous.responderLongitude;
  const responderLocationUpdatedAt =
    input.responderLocationUpdatedAt !== undefined
      ? input.responderLocationUpdatedAt
      : previous.responderLocationUpdatedAt;

  const hasPrivate =
    Boolean(citizenPhone || responderPhone) ||
    (typeof responderLatitude === 'number' && typeof responderLongitude === 'number');

  if (!hasPrivate) {
    return visible;
  }

  const encoded = encodeMeta({
    v: 1,
    c: citizenPhone,
    r: responderPhone,
    rlat: responderLatitude,
    rlng: responderLongitude,
    rat: responderLocationUpdatedAt,
  });

  return `${visible ?? ''}${MARKER}${encoded}`;
}

export function hydrateEmergencyAlertRow(row: {
  id: string;
  guest_id: string;
  citizen_name: string;
  citizen_phone?: string | null;
  location_label: string;
  latitude: number;
  longitude: number;
  message: string | null;
  status: 'active' | 'responding' | 'resolved';
  responded_by_guest_id: string | null;
  responded_by_name: string | null;
  responder_phone?: string | null;
  responder_latitude?: number | null;
  responder_longitude?: number | null;
  responder_location_updated_at?: string | null;
  created_at: string;
  updated_at: string;
}) {
  const split = splitSosMessage(row.message);

  return {
    id: row.id,
    guest_id: row.guest_id,
    citizen_name: row.citizen_name,
    citizen_phone: row.citizen_phone ?? split.citizenPhone,
    location_label: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    message: split.visibleMessage,
    status: row.status,
    responded_by_guest_id: row.responded_by_guest_id,
    responded_by_name: row.responded_by_name,
    responder_phone: row.responder_phone ?? split.responderPhone,
    responder_latitude: row.responder_latitude ?? split.responderLatitude,
    responder_longitude: row.responder_longitude ?? split.responderLongitude,
    responder_location_updated_at:
      row.responder_location_updated_at ?? split.responderLocationUpdatedAt,
    created_at: row.created_at,
    updated_at: row.updated_at,
    _rawMessage: split.rawMessage ?? row.message,
  };
}

export type HydratedEmergencyAlert = ReturnType<typeof hydrateEmergencyAlertRow>;
