import type { AuditEntry, NewAuditEntry } from "./AuditEntry.js";

// Entries are only ever added (the database refuses changes too)
export interface AuditRepository {
  add(entry: NewAuditEntry, at: Date): Promise<void>;
  // Newest first; "before" pages back through older entries
  listForOwner(
    ownerId: string,
    options: { limit: number; before?: Date },
  ): Promise<AuditEntry[]>;
  listForRecord(recordId: string): Promise<AuditEntry[]>;
}
