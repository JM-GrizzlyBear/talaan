import { TRASH_DAYS, labFlag, type RecordFields } from "@talaan/shared";

const DAY = 24 * 60 * 60 * 1000;

// When a record in the Trash is deleted for good
export function purgeAt(deletedAt: Date) {
  return new Date(deletedAt.getTime() + TRASH_DAYS * DAY);
}

// Records put in the Trash before this time are due to be deleted for good
export function purgeCutoff(now: Date) {
  return new Date(now.getTime() - TRASH_DAYS * DAY);
}

export function outOfRangeCount(fields: RecordFields) {
  if (fields.type !== "lab") return 0;
  return fields.details.results.filter((r) => labFlag(r) !== null).length;
}
