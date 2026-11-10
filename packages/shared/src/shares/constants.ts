export const SHARE_LIMITS = {
  recipient: 80,
  note: 300,
  // Records picked for one link
  records: 300,
  // Links still open at once, per account
  open: 50,
  // The longest a link can last
  maxDays: 365,
  // The shortest (minutes)
  minMinutes: 10,
  maxViews: 100,
  pinLength: 6,
  // Wrong PINs before the link waits a while
  pinTries: 5,
  pinWaitMinutes: 15,
};

const HOUR = 60;
const DAY = 24 * HOUR;

// The quick choices for how long a link lasts (the form also takes a number
// of hours, days or weeks, or a date and time)
export const SHARE_DURATIONS = [
  { key: "1h", label: "1 hour", minutes: HOUR },
  { key: "1d", label: "1 day", minutes: DAY },
  { key: "7d", label: "7 days", minutes: 7 * DAY },
  { key: "30d", label: "30 days", minutes: 30 * DAY },
] as const;
export const DEFAULT_SHARE_DURATION = "7d";

export const DURATION_UNITS = {
  hours: { label: "hours", minutes: HOUR },
  days: { label: "days", minutes: DAY },
  weeks: { label: "weeks", minutes: 7 * DAY },
} as const;
export type DurationUnit = keyof typeof DURATION_UNITS;

export const SHARE_STATUSES = ["open", "used", "expired", "stopped"] as const;
export type ShareStatus = (typeof SHARE_STATUSES)[number];

export const SHARE_STATUS_LABELS: Record<ShareStatus, string> = {
  open: "Open",
  // People who already opened it can still look until it ends
  used: "No more new opens",
  expired: "Ended",
  stopped: "Stopped",
};
