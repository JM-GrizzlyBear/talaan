// Emails are compared without capitals or surrounding spaces
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

// The website locks when nobody used it for the chosen number of minutes
export function isLockDue(
  lastSeenAt: number,
  now: number,
  lockAfterMinutes: number,
) {
  return now - lastSeenAt >= lockAfterMinutes * 60 * 1000;
}
