export const REMINDER_KINDS = [
  "checkup",
  "lab",
  "medicine",
  "refill",
  "vaccination",
  "hmo",
  "other",
] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const REMINDER_KIND_LABELS: Record<ReminderKind, string> = {
  checkup: "Checkup",
  lab: "Lab test",
  medicine: "Medicine",
  refill: "Refill",
  vaccination: "Vaccination",
  hmo: "HMO renewal",
  other: "Other",
};

// Alerts before each time, in minutes. 0: at the time.
export const ALERT_PRESETS = [0, 5, 15, 30, 60, 120, 1440, 10080] as const;

export const REMINDER_LIMITS = {
  title: 120,
  note: 1000,
  dose: 120,
  timesPerDay: 8,
  alerts: 5,
  // Your own alert: up to 30 days before
  alertMinutes: 30 * 24 * 60,
  interval: 365,
  count: 1000,
  // How far ahead a schedule is followed
  years: 40,
};

// Talaan keeps time in Philippine time, which has no daylight saving:
// always 8 hours ahead of UTC
export const TIME_ZONE = "Asia/Manila";
export const TIME_ZONE_OFFSET_MINUTES = 8 * 60;

// Snooze choices on a reminder, in minutes ("tomorrow" is worked out apart)
export const SNOOZE_MINUTES = [10, 60] as const;
