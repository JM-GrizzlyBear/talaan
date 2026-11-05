import type { AuditEntryInfo } from "@talaan/shared";
import type { AuditEntry } from "../../../domain/audit/AuditEntry.js";

// Domain objects → what the browser receives (dates as ISO strings, no internal fields)

export function auditEntryJson(entry: AuditEntry): AuditEntryInfo {
  return {
    id: entry.id,
    action: entry.action,
    actorName: entry.actorName,
    subject: entry.subject,
    recordId: entry.recordId,
    changes: entry.changes,
    at: entry.createdAt.toISOString(),
  };
}
