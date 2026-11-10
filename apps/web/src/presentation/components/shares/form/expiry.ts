import {
  DEFAULT_SHARE_DURATION,
  DURATION_UNITS,
  type DurationUnit,
  SHARE_DURATIONS,
  SHARE_LIMITS,
} from "@talaan/shared";

const MINUTE = 60 * 1000;

// How long a link lasts: a quick choice, a number of hours/days/weeks, or
// until a date and time
export type Expiry =
  | { mode: "preset"; key: string }
  | { mode: "length"; amount: string; unit: DurationUnit }
  | { mode: "date"; value: string };

export const DEFAULT_EXPIRY: Expiry = {
  mode: "preset",
  key: DEFAULT_SHARE_DURATION,
};

// The end, or an error to show next to the choice
export function expiryDate(
  expiry: Expiry,
  now: Date,
): { at: Date } | { error: string } {
  let at: Date;
  if (expiry.mode === "preset") {
    const preset = SHARE_DURATIONS.find((d) => d.key === expiry.key);
    if (!preset) return { error: "Choose how long it lasts" };
    at = new Date(now.getTime() + preset.minutes * MINUTE);
  } else if (expiry.mode === "length") {
    const amount = Number(expiry.amount);
    if (!expiry.amount.trim() || !Number.isInteger(amount) || amount < 1) {
      return { error: "Enter a whole number, like 3" };
    }
    at = new Date(
      now.getTime() + amount * DURATION_UNITS[expiry.unit].minutes * MINUTE,
    );
  } else {
    // "2026-11-17T10:00": this device's time
    at = new Date(expiry.value);
    if (!expiry.value || Number.isNaN(at.getTime())) {
      return { error: "Choose a date and time" };
    }
  }
  if (at.getTime() < now.getTime() + SHARE_LIMITS.minMinutes * MINUTE) {
    return {
      error: `Choose a time at least ${SHARE_LIMITS.minMinutes} minutes from now`,
    };
  }
  if (at.getTime() > now.getTime() + SHARE_LIMITS.maxDays * 24 * 60 * MINUTE) {
    return { error: `A link can last up to ${SHARE_LIMITS.maxDays} days` };
  }
  return { at };
}

// For <input type="datetime-local">: "2026-11-17T10:00" in this device's time
export function localInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
