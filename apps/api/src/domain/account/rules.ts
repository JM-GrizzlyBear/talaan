const DAY = 24 * 60 * 60 * 1000;

// Suspended for a year, then deleted
export const KEEP_SUSPENDED_DAYS = 365;
// "Still suspended" at about 6 months
export const REMIND_AFTER_DAYS = 182;
// "Deleted in a week"
export const WARN_DAYS_BEFORE = 7;

export const deleteAfterFor = (at: Date) =>
  new Date(at.getTime() + KEEP_SUSPENDED_DAYS * DAY);

// What a suspended account needs now
export function nextStep(
  s: {
    suspendedAt: Date;
    deleteAfter: Date;
    remindedAt: Date | null;
    warnedAt: Date | null;
  },
  now: Date,
): "delete" | "warn" | "remind" | null {
  const t = now.getTime();
  if (t >= s.deleteAfter.getTime()) return "delete";
  if (!s.warnedAt && t >= s.deleteAfter.getTime() - WARN_DAYS_BEFORE * DAY) {
    return "warn";
  }
  if (
    !s.remindedAt &&
    !s.warnedAt &&
    t >= s.suspendedAt.getTime() + REMIND_AFTER_DAYS * DAY
  ) {
    return "remind";
  }
  return null;
}
