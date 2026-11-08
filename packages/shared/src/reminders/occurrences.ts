import { REMINDER_LIMITS } from "./constants.js";
import {
  addDays,
  compareDays,
  daysBetween,
  daysInMonth,
  type LocalDay,
  parseDay,
  toInstant,
  toLocal,
  weekdayOf,
} from "./localTime.js";
import type { Repeat, Schedule } from "./schedule.js";

// Monday of the week a day is in (weeks start on Monday)
const mondayOf = (d: LocalDay) => addDays(d, -((weekdayOf(d) + 6) % 7));

// Does the reminder happen on this day? (Days before the start never do.)
export function happensOn(repeat: Repeat, start: LocalDay, d: LocalDay) {
  const sinceStart = daysBetween(start, d);
  if (sinceStart < 0) return false;
  switch (repeat.every) {
    case "none":
      return sinceStart === 0;
    case "day":
      return sinceStart % repeat.interval === 0;
    case "week": {
      const weeks = daysBetween(mondayOf(start), mondayOf(d)) / 7;
      return (
        weeks % repeat.interval === 0 && repeat.weekdays.includes(weekdayOf(d))
      );
    }
    case "month": {
      const months = (d.year - start.year) * 12 + (d.month - start.month);
      if (months % repeat.interval !== 0) return false;
      const last = daysInMonth(d.year, d.month);
      if (repeat.on.type === "day") {
        return d.day === Math.min(repeat.on.day, last);
      }
      if (weekdayOf(d) !== repeat.on.weekday) return false;
      return repeat.on.week === -1
        ? d.day + 7 > last
        : Math.ceil(d.day / 7) === repeat.on.week;
    }
    case "year": {
      const years = d.year - start.year;
      if (years % repeat.interval !== 0) return false;
      // Feb 29 falls on Feb 28 in other years
      const day = Math.min(start.day, daysInMonth(d.year, start.month));
      return d.month === start.month && d.day === day;
    }
  }
}

// Every time the reminder happens, in order, from `from` on (or the start).
// With a count, the counting begins at the start even when `from` is later.
export function* occurrences(schedule: Schedule, from?: Date): Generator<Date> {
  const start = parseDay(schedule.start);
  const until =
    schedule.end.type === "until" ? parseDay(schedule.end.date) : null;
  const limit = schedule.end.type === "count" ? schedule.end.count : Infinity;
  const horizon = addDays(start, REMINDER_LIMITS.years * 366);

  // Without a count, days before `from` can be skipped (a day matches or
  // not on its own); with a count they still have to be counted
  let day = start;
  if (from && limit === Infinity) {
    const fromDay = addDays(toLocal(from).day, -1);
    if (compareDays(fromDay, start) > 0) day = fromDay;
  }
  if (schedule.repeat.every === "none") day = start;

  let counted = 0;
  while (compareDays(day, horizon) <= 0) {
    if (until && compareDays(day, until) > 0) return;
    if (happensOn(schedule.repeat, start, day)) {
      for (const time of schedule.times) {
        if (counted >= limit) return;
        counted++;
        const at = toInstant(day, time);
        if (!from || at >= from) yield at;
      }
      if (schedule.repeat.every === "none") return;
    }
    day = addDays(day, 1);
  }
}

// The next few times at or after a moment
export function nextOccurrences(schedule: Schedule, from: Date, max: number) {
  const found: Date[] = [];
  for (const at of occurrences(schedule, from)) {
    found.push(at);
    if (found.length >= max) break;
  }
  return found;
}

// Every time in [from, to)
export function occurrencesBetween(schedule: Schedule, from: Date, to: Date) {
  const found: Date[] = [];
  for (const at of occurrences(schedule, from)) {
    if (at >= to) break;
    found.push(at);
  }
  return found;
}
