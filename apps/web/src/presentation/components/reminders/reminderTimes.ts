import { TIME_ZONE } from "@talaan/shared";

// Reminders are in Philippine time, wherever the browser is

const dayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: TIME_ZONE,
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});
const keyFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});

// "8:00 AM"
export const timeText = (at: Date | string) => timeFormat.format(new Date(at));

// "2026-11-10", to group times by day
export const dayKey = (at: Date | string) => keyFormat.format(new Date(at));

// "Today", "Tomorrow", or "Thu, Nov 12"
export function dayHeading(at: Date | string, now = new Date()) {
  const key = dayKey(at);
  if (key === dayKey(now)) return "Today";
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (key === dayKey(tomorrow)) return "Tomorrow";
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (key === dayKey(yesterday)) return "Yesterday";
  return dayFormat.format(new Date(at));
}

// "Today at 8:00 AM", "Thu, Nov 12 at 8:00 PM"
export const whenText = (at: Date | string, now = new Date()) =>
  `${dayHeading(at, now)} at ${timeText(at)}`;
