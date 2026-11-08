import { TIME_ZONE_OFFSET_MINUTES } from "./constants.js";

// A day in Philippine time, kept as midnight UTC of that date so the date
// maths (adding days, the weekday) never meets a time zone
export interface LocalDay {
  year: number;
  // 0 January … 11 December
  month: number;
  day: number;
}

const DAY = 24 * 60 * 60 * 1000;

export function parseDay(text: string): LocalDay {
  const [year, month, day] = text.split("-").map(Number);
  return { year, month: month - 1, day };
}

export const dayText = (d: LocalDay) =>
  `${d.year}-${String(d.month + 1).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

const asUtc = (d: LocalDay) => Date.UTC(d.year, d.month, d.day);

function fromUtc(ms: number): LocalDay {
  const date = new Date(ms);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

export const addDays = (d: LocalDay, days: number) =>
  fromUtc(asUtc(d) + days * DAY);

export const daysBetween = (from: LocalDay, to: LocalDay) =>
  Math.round((asUtc(to) - asUtc(from)) / DAY);

// 0 Sunday … 6 Saturday
export const weekdayOf = (d: LocalDay) => new Date(asUtc(d)).getUTCDay();

export const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

export const compareDays = (a: LocalDay, b: LocalDay) => asUtc(a) - asUtc(b);

// "08:30" on that day in the Philippines → the moment it happens
export function toInstant(d: LocalDay, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(
    Date.UTC(d.year, d.month, d.day, hours, minutes) -
      TIME_ZONE_OFFSET_MINUTES * 60 * 1000,
  );
}

// The moment → its day and "HH:MM" in the Philippines
export function toLocal(instant: Date): { day: LocalDay; time: string } {
  const shifted = new Date(
    instant.getTime() + TIME_ZONE_OFFSET_MINUTES * 60 * 1000,
  );
  return {
    day: {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth(),
      day: shifted.getUTCDate(),
    },
    time: `${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`,
  };
}

// Today in the Philippines, as "YYYY-MM-DD"
export const todayText = (now: Date) => dayText(toLocal(now).day);
