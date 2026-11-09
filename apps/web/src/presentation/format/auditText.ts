import type { AuditEntryInfo } from "@talaan/shared";

// One sentence for a history entry, like "Ana Reyes edited “CBC”"
export function auditSentence(entry: AuditEntryInfo) {
  const who = entry.actorName ?? "Someone";
  const what = `“${entry.subject}”`;
  switch (entry.action) {
    case "record.created":
      return `${who} added ${what}`;
    case "record.edited":
      return `${who} edited ${what}`;
    case "record.trashed":
      return `${who} moved ${what} to the Trash`;
    case "record.restored":
      return `${who} restored ${what} from the Trash`;
    case "record.deleted":
      return `${who} deleted ${what} for good`;
    case "record.purged":
      return `Talaan deleted ${what} for good after 30 days in the Trash`;
    case "record.file_added":
      return `${who} attached a file to ${what}`;
    case "record.file_removed":
      return `${who} removed a file from ${what}`;
    case "profile.added":
      return `${who} added a profile for ${entry.subject}`;
    case "profile.edited":
      return `${who} edited ${entry.subject}'s profile`;
    case "profile.removed":
      return `${who} removed ${entry.subject}'s profile`;
    case "family.invited":
      return `${who} invited ${entry.subject} to see the records`;
    case "family.invitation_cancelled":
      return `${who} cancelled the invitation to ${entry.subject}`;
    case "family.accepted":
      return `${entry.subject} accepted the invitation`;
    case "family.declined":
      return `${entry.subject} declined the invitation`;
    case "family.access_changed":
      return `${who} changed what ${entry.subject} can do`;
    case "family.removed":
      return `${who} stopped sharing the records with ${entry.subject}`;
    case "family.left":
      return `${entry.subject} stopped seeing the records`;
    case "place.created":
      return `${who} added the place ${what}`;
    case "place.edited":
      return `${who} edited the place ${what}`;
    case "place.removed":
      return `${who} removed the place ${what}`;
    case "reminder.created":
      return `${who} added the reminder ${what}`;
    case "reminder.edited":
      return `${who} edited the reminder ${what}`;
    case "reminder.paused":
      return `${who} paused the reminder ${what}`;
    case "reminder.resumed":
      return `${who} resumed the reminder ${what}`;
    case "reminder.removed":
      return `${who} removed the reminder ${what}`;
    case "medicalid.edited":
      return `${who} edited the Medical ID of ${entry.subject}`;
    case "medicalid.emergency":
      return `${who} changed the emergency QR of ${entry.subject}`;
    case "share.created":
      return `${who} made a link for ${entry.subject}`;
    case "share.changed":
      return `${who} changed the link for ${entry.subject}`;
    case "share.stopped":
      return `${who} stopped the link for ${entry.subject}`;
    case "share.opened":
      return `The link for ${entry.subject} was opened`;
    case "labels.created":
      return `${who} made ${entry.subject} to print`;
  }
}

// "Hemoglobin result: 6.0 g/dL → 8.0 g/dL", "Doctor: (empty) → Dr. Cruz",
// "Lab test added: Platelet: 250". New items (an invitation's access) read plainly.
export function changeText(
  change: AuditEntryInfo["changes"][number],
  action: AuditEntryInfo["action"],
) {
  if (change.field.endsWith(" added"))
    return `${change.field}: ${change.to ?? ""}`;
  if (change.field.endsWith(" removed")) {
    return `${change.field}: ${change.from ?? ""}`;
  }
  const isEdit = action.endsWith("edited") || action.endsWith("changed");
  if (!isEdit) return `${change.field}: ${change.to ?? change.from ?? ""}`;
  return `${change.field}: ${change.from ?? "(empty)"} → ${change.to ?? "(empty)"}`;
}
