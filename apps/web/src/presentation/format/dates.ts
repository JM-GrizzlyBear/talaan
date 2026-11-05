// "Oct 19, 2026, 11:14 PM" in the reader's own time zone and language
export function shortDateTime(iso: string, locale?: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

// "Nov 14, 2026". A plain "YYYY-MM-DD" (a birthday) is read as that calendar day.
export function shortDate(value: string, locale?: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
