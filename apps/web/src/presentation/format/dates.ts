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

// True when a note was changed after it was created
export function wasEdited(note: { createdAt: string; updatedAt: string }) {
  return (
    new Date(note.updatedAt).getTime() > new Date(note.createdAt).getTime()
  );
}
