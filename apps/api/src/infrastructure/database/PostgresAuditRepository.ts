import type { AuditAction, AuditChange } from "@talaan/shared";
import type { Pool } from "pg";
import type {
  AuditEntry,
  NewAuditEntry,
} from "../../domain/audit/AuditEntry.js";
import type { AuditRepository } from "../../domain/audit/AuditRepository.js";

interface AuditRow {
  id: string;
  owner_id: string;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  record_id: string | null;
  subject: string;
  changes: AuditChange[];
  created_at: Date;
}

const COLUMNS =
  "id, owner_id, action, actor_id, actor_name, record_id, subject, changes, created_at";

function toEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    ownerId: row.owner_id,
    action: row.action as AuditAction,
    actorId: row.actor_id,
    actorName: row.actor_name,
    recordId: row.record_id,
    subject: row.subject,
    changes: row.changes,
    createdAt: row.created_at,
  };
}

export class PostgresAuditRepository implements AuditRepository {
  constructor(private readonly pool: Pool) {}

  async add(entry: NewAuditEntry, at: Date) {
    await this.pool.query(
      `insert into audit_log
         (owner_id, action, actor_id, actor_name, record_id, subject, changes, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.ownerId,
        entry.action,
        entry.actorId,
        entry.actorName,
        entry.recordId,
        entry.subject.slice(0, 255),
        JSON.stringify(entry.changes),
        at,
      ],
    );
  }

  async listForOwner(
    ownerId: string,
    options: { limit: number; before?: Date },
  ) {
    const result = await this.pool.query<AuditRow>(
      `select ${COLUMNS} from audit_log
        where owner_id = $1 and ($2::timestamptz is null or created_at < $2)
        order by created_at desc, seq desc
        limit $3`,
      [ownerId, options.before ?? null, options.limit],
    );
    return result.rows.map(toEntry);
  }

  async listForRecord(recordId: string) {
    const result = await this.pool.query<AuditRow>(
      `select ${COLUMNS} from audit_log
        where record_id = $1
        order by created_at desc, seq desc`,
      [recordId],
    );
    return result.rows.map(toEntry);
  }
}
