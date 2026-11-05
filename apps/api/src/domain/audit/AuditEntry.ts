import type { AuditAction, AuditChange } from "@talaan/shared";

export interface AuditEntry {
  id: string;
  ownerId: string;
  action: AuditAction;
  actorId: string | null;
  actorName: string | null;
  recordId: string | null;
  subject: string;
  changes: AuditChange[];
  createdAt: Date;
}

export type NewAuditEntry = Omit<AuditEntry, "id" | "createdAt">;
