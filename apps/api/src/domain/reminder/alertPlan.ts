import { nextOccurrences, occurrences, type Schedule } from "@talaan/shared";
import type { Occurrence } from "./Reminder.js";

const MINUTE = 60 * 1000;

export interface DueAlert {
  occursAt: Date;
  alertAt: Date;
  // How long before the time it was meant to go out (0: at the time;
  // null: a snooze ending)
  minutesBefore: number | null;
}

interface Plannable {
  schedule: Schedule;
  alerts: number[];
}

const key = (d: Date) => d.toISOString();

// Times already done, skipped or snoozed send no more alerts of their own
function settled(states: Occurrence[]) {
  return new Set(states.map((s) => key(s.occursAt)));
}

// The alerts due in (from, to], newest last. A snooze sends one alert when
// it ends (unless the time was then marked done or skipped).
export function dueAlerts(
  reminder: Plannable,
  states: Occurrence[],
  from: Date,
  to: Date,
): DueAlert[] {
  const handled = settled(states);
  const maxBefore = Math.max(0, ...reminder.alerts);
  const due: DueAlert[] = [];
  // Times whose alerts can fall in the window
  const first = new Date(from.getTime());
  for (const occursAt of occurrences(reminder.schedule, first)) {
    if (occursAt.getTime() - maxBefore * MINUTE > to.getTime()) break;
    if (handled.has(key(occursAt))) continue;
    for (const minutes of reminder.alerts) {
      const alertAt = new Date(occursAt.getTime() - minutes * MINUTE);
      if (alertAt > from && alertAt <= to) {
        due.push({ occursAt, alertAt, minutesBefore: minutes });
      }
    }
  }
  for (const s of states) {
    if (s.state === "snoozed" && s.snoozedUntil) {
      if (s.snoozedUntil > from && s.snoozedUntil <= to) {
        due.push({
          occursAt: s.occursAt,
          alertAt: s.snoozedUntil,
          minutesBefore: null,
        });
      }
    }
  }
  return due.sort((a, b) => a.alertAt.getTime() - b.alertAt.getTime());
}

// One alert per time: after a pause in sending, only the latest of a time's
// alerts goes out (no "1 day before" and "at the time" together)
export function latestPerOccurrence(alerts: DueAlert[]) {
  const latest = new Map<string, DueAlert>();
  for (const alert of alerts) latest.set(key(alert.occursAt), alert);
  return [...latest.values()];
}

// The first alert after `after`, or null when none are left
export function nextAlertAt(
  reminder: Plannable & { paused: boolean },
  states: Occurrence[],
  after: Date,
): Date | null {
  if (reminder.paused) return null;
  const handled = settled(states);
  let best: Date | null = null;
  for (const s of states) {
    if (s.state === "snoozed" && s.snoozedUntil && s.snoozedUntil > after) {
      if (!best || s.snoozedUntil < best) best = s.snoozedUntil;
    }
  }
  if (reminder.alerts.length === 0) return best;
  const maxBefore = Math.max(...reminder.alerts);
  // Times from `after` on can still have alerts after `after`
  let looked = 0;
  for (const occursAt of occurrences(reminder.schedule, after)) {
    // Later times can't have an earlier alert than the best one found
    if (best && occursAt.getTime() - maxBefore * MINUTE > best.getTime()) {
      break;
    }
    if (++looked > 2000) break;
    if (handled.has(key(occursAt))) continue;
    for (const minutes of reminder.alerts) {
      const alertAt = new Date(occursAt.getTime() - minutes * MINUTE);
      if (alertAt > after && (!best || alertAt < best)) best = alertAt;
    }
  }
  return best;
}

// The next time that's still waiting (not done or skipped), or null
export function nextPending(
  schedule: Schedule,
  states: Occurrence[],
  from: Date,
): Date | null {
  const handled = new Set(
    states.filter((s) => s.state !== "snoozed").map((s) => key(s.occursAt)),
  );
  for (const at of nextOccurrences(schedule, from, 500)) {
    if (!handled.has(key(at))) return at;
  }
  return null;
}
