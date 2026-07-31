import { brand } from '@/constants/data';

/** Civic app clock — always Hazaribagh local time, not the device timezone. */
export const TOWN_TIMEZONE = 'Asia/Kolkata';

export type TownClock = {
  iso: string;
  hour: number;
  greeting: string;
};

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

/** Hour on the user's device (local timezone). */
export function getLocalHour(date = new Date()): number {
  const hourPart = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .find((part) => part.type === 'hour');

  const hour = Number(hourPart?.value ?? date.getHours());
  return hour === 24 ? 0 : hour;
}

export function getTownHour(date = new Date()): number {
  const hourPart = new Intl.DateTimeFormat('en-GB', {
    timeZone: TOWN_TIMEZONE,
    hour: 'numeric',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .find((part) => part.type === 'hour');

  return Number(hourPart?.value ?? 0);
}

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function greetingForHour(hour: number): string {
  const part = getTimeOfDay(hour);
  if (part === 'morning') return 'Good morning';
  if (part === 'afternoon') return 'Good afternoon';
  return 'Good evening';
}

export function getTimeOfDayGreeting(date = new Date()): string {
  return greetingForHour(getLocalHour(date));
}

export function buildTownClock(date = new Date()): TownClock {
  const hour = getLocalHour(date);
  return {
    iso: date.toISOString(),
    hour,
    greeting: greetingForHour(hour),
  };
}

/** ISO-like timestamp in town timezone for debugging / API parity. */
export function formatTownIso(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TOWN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';

  return `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

export function townTimezoneLabel() {
  return brand.location.split(',').slice(-1)[0]?.trim() ?? 'India';
}
