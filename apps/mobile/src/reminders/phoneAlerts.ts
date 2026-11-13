import {
  describeAlert,
  occurrencesBetween,
  type ReminderSummary,
} from "@talaan/shared";

// The reminders' alerts as notifications on this phone, worked out here so
// they come on time even without internet. The next few days are planned
// each time the app opens (phones keep at most 64 waiting notifications).
export interface PhoneAlert {
  // Same alert, same id: planning again doesn't make duplicates
  id: string;
  at: Date;
  title: string;
  body: string;
  reminderId: string;
}

const DAY = 24 * 60 * 60 * 1000;
const timeText = (at: Date) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(at);

export function planPhoneAlerts(
  reminders: ReminderSummary[],
  // "reminderId|at" of times already done or skipped
  handled: Set<string>,
  now: Date,
  { days = 7, max = 60 }: { days?: number; max?: number } = {},
): PhoneAlert[] {
  const until = new Date(now.getTime() + days * DAY);
  const plan: PhoneAlert[] = [];
  for (const r of reminders) {
    if (r.paused || r.mutedByMe || r.alerts.length === 0 || !r.nextAt) continue;
    const longest = Math.max(...r.alerts);
    // An alert before the time can be for a time a little after the window
    const times = occurrencesBetween(
      r.schedule,
      now,
      new Date(until.getTime() + longest * 60_000),
    );
    for (const time of times) {
      if (handled.has(`${r.id}|${time.toISOString()}`)) continue;
      for (const minutes of r.alerts) {
        const at = new Date(time.getTime() - minutes * 60_000);
        if (at <= now || at > until) continue;
        const who = r.personName ? ` (${r.personName})` : "";
        plan.push({
          id: `${r.id}|${time.toISOString()}|${minutes}`,
          at,
          title: `${r.title}${who}`,
          body:
            minutes === 0
              ? `Now${r.dose ? `: ${r.dose}` : ""}`
              : `${describeAlert(minutes)}: at ${timeText(time)}${r.dose ? ` · ${r.dose}` : ""}`,
          reminderId: r.id,
        });
      }
    }
  }
  return plan.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, max);
}
