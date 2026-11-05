// "YYYY-MM-DD" that is a real calendar day, from 1900 up to today
export function isPastCalendarDate(value: string, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || !date.toISOString().startsWith(value)) {
    return false;
  }
  // A day ahead of UTC, so "today" in the Philippines (UTC+8) is never refused
  const latest = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return value >= "1900-01-01" && value <= latest;
}
