// The form keeps dates as "YYYY-MM-DD" and times as "HH:MM" (like the
// website's date and time boxes); the phone's pickers use Date objects

const pad = (n: number) => String(n).padStart(2, "0");

export const fromDateValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const fromTimeValue = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function toDateValue(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date();
}

export function toTimeValue(value: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  const d = new Date();
  if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

// month/day/year, the way the person asked for dates to read
export function showDate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : value;
}

export function showTime(value: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return value;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}
