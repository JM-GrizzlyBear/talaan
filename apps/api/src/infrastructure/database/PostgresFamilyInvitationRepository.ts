import type { AccessLevel, FamilyRelationship } from "@talaan/shared";
import type { Pool } from "pg";
import type {
  FamilyInvitation,
  StoredInvitationStatus,
} from "../../domain/family/FamilyInvitation.js";
import type {
  FamilyInvitationRepository,
  NewInvitation,
} from "../../domain/family/FamilyInvitationRepository.js";

interface InvitationRow {
  id: string;
  inviter_id: string;
  email: string;
  relationship: string;
  access: string;
  token_hash: string;
  status: string;
  invitee_id: string | null;
  created_at: Date;
  sent_at: Date;
  expires_at: Date;
  responded_at: Date | null;
}

const COLUMNS =
  "id, inviter_id, email, relationship, access, token_hash, status, invitee_id, created_at, sent_at, expires_at, responded_at";

function toInvitation(row: InvitationRow): FamilyInvitation {
  return {
    id: row.id,
    inviterId: row.inviter_id,
    email: row.email,
    relationship: row.relationship as FamilyRelationship,
    access: row.access as AccessLevel,
    tokenHash: row.token_hash,
    status: row.status as StoredInvitationStatus,
    inviteeId: row.invitee_id,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    expiresAt: row.expires_at,
    respondedAt: row.responded_at,
  };
}

export class PostgresFamilyInvitationRepository implements FamilyInvitationRepository {
  constructor(private readonly pool: Pool) {}

  private async one(sql: string, values: unknown[]) {
    const result = await this.pool.query<InvitationRow>(sql, values);
    return result.rows[0] ? toInvitation(result.rows[0]) : null;
  }

  async upsertPending(invitation: NewInvitation, sentAt: Date) {
    const result = await this.pool.query<InvitationRow>(
      `insert into family_invitations
         (inviter_id, email, relationship, access, token_hash, expires_at, created_at, sent_at)
       values ($1, $2, $3, $4, $5, $6, $7, $7)
       on conflict (inviter_id, email) where status = 'pending'
       do update set relationship = excluded.relationship,
                     access = excluded.access,
                     token_hash = excluded.token_hash,
                     expires_at = excluded.expires_at,
                     sent_at = excluded.sent_at
       returning ${COLUMNS}`,
      [
        invitation.inviterId,
        invitation.email,
        invitation.relationship,
        invitation.access,
        invitation.tokenHash,
        invitation.expiresAt,
        sentAt,
      ],
    );
    return toInvitation(result.rows[0]);
  }

  async findById(id: string) {
    return await this.one(
      `select ${COLUMNS} from family_invitations where id = $1`,
      [id],
    );
  }

  async findByTokenHash(tokenHash: string) {
    return await this.one(
      `select ${COLUMNS} from family_invitations where token_hash = $1`,
      [tokenHash],
    );
  }

  async listOpenForInviter(inviterId: string) {
    const result = await this.pool.query<InvitationRow>(
      `select ${COLUMNS} from family_invitations
        where inviter_id = $1 and status in ('pending', 'declined')
        order by sent_at desc`,
      [inviterId],
    );
    return result.rows.map(toInvitation);
  }

  async countPendingForInviter(inviterId: string, now: Date) {
    const result = await this.pool.query<{ n: number }>(
      `select count(*)::int as n from family_invitations
        where inviter_id = $1 and status = 'pending' and expires_at > $2`,
      [inviterId, now],
    );
    return result.rows[0].n;
  }

  async renew(id: string, tokenHash: string, sentAt: Date, expiresAt: Date) {
    // A declined invitation goes back to waiting. If another invitation to the
    // same email is already waiting, that one is cancelled to keep just one.
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `update family_invitations other
            set status = 'cancelled', responded_at = $2
           from family_invitations this
          where this.id = $1 and other.id <> this.id
            and other.inviter_id = this.inviter_id and other.email = this.email
            and other.status = 'pending'`,
        [id, sentAt],
      );
      await client.query(
        `update family_invitations
            set token_hash = $2, sent_at = $3, expires_at = $4,
                status = 'pending', responded_at = null, invitee_id = null
          where id = $1`,
        [id, tokenHash, sentAt, expiresAt],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async setStatus(
    id: string,
    status: StoredInvitationStatus,
    at: Date,
    inviteeId?: string,
  ) {
    await this.pool.query(
      `update family_invitations
          set status = $2, responded_at = $3, invitee_id = coalesce($4, invitee_id)
        where id = $1`,
      [id, status, at, inviteeId ?? null],
    );
  }
}
