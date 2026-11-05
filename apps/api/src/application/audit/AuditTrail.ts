import { fullName, type AuditAction, type AuditChange } from "@talaan/shared";
import type { AuditRepository } from "../../domain/audit/AuditRepository.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import type { Clock } from "../ports/Clock.js";

export interface AuditEvent {
  // The account whose records (or sharing) it's about
  ownerId: string;
  action: AuditAction;
  // null: Talaan itself (emptying old Trash), or someone without an account
  actorId: string | null;
  subject: string;
  recordId?: string | null;
  changes?: AuditChange[];
}

// Writes the history: who did what, to what, and when. The actor's name is
// saved with the entry, so it still reads right if they leave later.
export class AuditTrail {
  constructor(
    private readonly audit: AuditRepository,
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async log(event: AuditEvent) {
    const actor = event.actorId
      ? await this.users.findById(event.actorId)
      : null;
    await this.audit.add(
      {
        ownerId: event.ownerId,
        action: event.action,
        actorId: event.actorId,
        actorName: actor ? fullName(actor) : null,
        recordId: event.recordId ?? null,
        subject: event.subject,
        changes: event.changes ?? [],
      },
      this.clock.now(),
    );
  }

  async forOwner(ownerId: string, options: { limit: number; before?: Date }) {
    return await this.audit.listForOwner(ownerId, options);
  }

  async forRecord(recordId: string) {
    return await this.audit.listForRecord(recordId);
  }
}
