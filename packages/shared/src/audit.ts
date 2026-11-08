// The history (audit trail): who did what, to which record or setting, and when

export const AUDIT_ACTIONS = [
  "record.created",
  "record.edited",
  "record.trashed",
  "record.restored",
  "record.deleted",
  "record.purged",
  "record.file_added",
  "record.file_removed",
  "profile.added",
  "profile.edited",
  "profile.removed",
  "family.invited",
  "family.invitation_cancelled",
  "family.accepted",
  "family.declined",
  "family.access_changed",
  "family.removed",
  "family.left",
  "place.created",
  "place.edited",
  "place.removed",
  "labels.created",
  "reminder.created",
  "reminder.edited",
  "reminder.paused",
  "reminder.resumed",
  "reminder.removed",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// One changed field: "Hemoglobin result: 6.0 → 8.0"
export interface AuditChange {
  field: string;
  from: string | null;
  to: string | null;
}

export interface AuditEntryInfo {
  id: string;
  action: AuditAction;
  // Who did it: their name at the time (null: Talaan itself, like emptying old Trash)
  actorName: string | null;
  // What it was about: a record's title, a profile's name, an email
  subject: string;
  recordId: string | null;
  changes: AuditChange[];
  at: string;
}
