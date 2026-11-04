import type { Pool } from "pg";
import type { EmailCode } from "../../domain/emailCode/EmailCode.js";
import type { EmailCodeRepository } from "../../domain/emailCode/EmailCodeRepository.js";

interface ResetCodeRow {
  user_id: string;
  code_hash: string;
  expires_at: Date;
  tries: number;
}

// The tables that hold emailed codes. Same columns, one per purpose.
export type EmailCodeTable = "password_reset_codes" | "sign_in_codes";

export class PostgresEmailCodeRepository implements EmailCodeRepository {
  constructor(
    private readonly pool: Pool,
    private readonly table: EmailCodeTable,
  ) {}

  async replace(code: Omit<EmailCode, "tries">) {
    // One row per account: a new request replaces the old code and resets the tries
    await this.pool.query(
      `insert into ${this.table} (user_id, code_hash, expires_at)
       values ($1, $2, $3)
       on conflict (user_id) do update
         set code_hash = excluded.code_hash, expires_at = excluded.expires_at,
             tries = 0, created_at = now()`,
      [code.userId, code.codeHash, code.expiresAt],
    );
  }

  async find(userId: string) {
    const result = await this.pool.query<ResetCodeRow>(
      `select user_id, code_hash, expires_at, tries
         from ${this.table} where user_id = $1`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      userId: row.user_id,
      codeHash: row.code_hash,
      expiresAt: row.expires_at,
      tries: row.tries,
    };
  }

  async addTry(userId: string) {
    const result = await this.pool.query<{ tries: number }>(
      `update ${this.table} set tries = tries + 1
        where user_id = $1 returning tries`,
      [userId],
    );
    return result.rows[0]?.tries ?? 0;
  }

  async remove(userId: string) {
    await this.pool.query(`delete from ${this.table} where user_id = $1`, [
      userId,
    ]);
  }
}
