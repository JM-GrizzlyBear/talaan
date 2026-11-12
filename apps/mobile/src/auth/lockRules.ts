// When the app locks itself: at start, and after being away (in the
// background) for longer than the person's "lock after" setting
export function shouldLockOnReturn(
  leftAt: number | null,
  now: number,
  lockAfterMinutes: number,
) {
  if (leftAt === null) return false;
  return now - leftAt >= lockAfterMinutes * 60 * 1000;
}
