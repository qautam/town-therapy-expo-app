/** Canonical volunteer hour estimate shared across profile + admin.
 * Hours only accrue after a volunteer marks a past drive complete.
 */
export const HOURS_PER_DRIVE = 3;

export function hoursFromDrives(drivesCompleted: number) {
  return Math.max(0, drivesCompleted) * HOURS_PER_DRIVE;
}

/** A drive is eligible to mark complete once its scheduled start time has passed. */
export function isDrivePast(startsAt: string, now = Date.now()) {
  return new Date(startsAt).getTime() <= now;
}

/** @deprecated use isDrivePast — completion is now an explicit check-in */
export function isDriveCompleted(startsAt: string, now = Date.now()) {
  return isDrivePast(startsAt, now);
}
