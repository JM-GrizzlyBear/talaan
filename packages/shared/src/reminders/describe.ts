import { parseDay, weekdayOf } from "./localTime.js";
import type { Schedule } from "./schedule.js";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const ORDINAL_WEEKS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  [-1]: "last",
};

// "08:30" → "8:30 AM"
export function timeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// "2026-11-10" → "Nov 10, 2026"
export function dayLabel(text: string) {
  const d = parseDay(text);
  return `${MONTHS[d.month]} ${d.day}, ${d.year}`;
}

const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
};

const list = (items: string[]) =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

const every = (interval: number, one: string, many: string) =>
  interval === 1 ? `Every ${one}` : `Every ${interval} ${many}`;

// "Every day at 8:00 AM and 8:00 PM, for 7 times" and the like
export function describeSchedule(schedule: Schedule) {
  const times = `at ${list(schedule.times.map(timeLabel))}`;
  const r = schedule.repeat;
  let when: string;
  switch (r.every) {
    case "none":
      return `${dayLabel(schedule.start)} ${times}`;
    case "day":
      when = every(r.interval, "day", "days");
      break;
    case "week": {
      const days =
        r.weekdays.length === 7
          ? "every day"
          : list(r.weekdays.map((d) => SHORT_WEEKDAYS[d]));
      when =
        r.interval === 1
          ? `Every week on ${days}`
          : `Every ${r.interval} weeks on ${days}`;
      break;
    }
    case "month": {
      const on =
        r.on.type === "day"
          ? `the ${ordinal(r.on.day)}`
          : `the ${ORDINAL_WEEKS[r.on.week]} ${WEEKDAYS[r.on.weekday]}`;
      when = `${every(r.interval, "month", "months")} on ${on}`;
      break;
    }
    case "year": {
      const d = parseDay(schedule.start);
      when = `${every(r.interval, "year", "years")} on ${MONTHS[d.month]} ${d.day}`;
      break;
    }
  }
  const from = `from ${dayLabel(schedule.start)}`;
  const end =
    schedule.end.type === "until"
      ? `, until ${dayLabel(schedule.end.date)}`
      : schedule.end.type === "count"
        ? `, ${schedule.end.count} ${schedule.end.count === 1 ? "time" : "times"} in all`
        : "";
  return `${when} ${times}, ${from}${end}`;
}

// 0 → "At the time", 90 → "1 hour 30 minutes before", 1440 → "1 day before"
export function describeAlert(minutes: number) {
  if (minutes === 0) return "At the time";
  const parts: string[] = [];
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days % 7 === 0 && days > 0 && hours === 0 && mins === 0) {
    const weeks = days / 7;
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} before`;
  }
  if (days) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (mins) parts.push(`${mins} ${mins === 1 ? "minute" : "minutes"}`);
  return `${parts.join(" ")} before`;
}

// The weekday of a date, for the form ("Tuesday")
export const weekdayName = (text: string) =>
  WEEKDAYS[weekdayOf(parseDay(text))];
