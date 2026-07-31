-- Optional dedicated columns for responder live location during SOS.
-- Until these exist, the app embeds coordinates in the SOS message payload.

alter table public.emergency_alerts
  add column if not exists citizen_phone text;

alter table public.emergency_alerts
  add column if not exists responder_phone text;

alter table public.emergency_alerts
  add column if not exists responder_latitude double precision;

alter table public.emergency_alerts
  add column if not exists responder_longitude double precision;

alter table public.emergency_alerts
  add column if not exists responder_location_updated_at timestamptz;
