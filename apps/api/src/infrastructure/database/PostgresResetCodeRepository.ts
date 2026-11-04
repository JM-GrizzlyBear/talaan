import type { Pool } from "pg";
import type { ResetCode } from "../../domain/passwordReset/ResetCode.js";
import type { ResetCodeRepository } from "../../domain/passwordReset/ResetCodeRepository.js";

interface ResetCodeRow {
  user_id: string;
  code_hash: string;
  expires_at: Date;
  tries: number;
}

export class PostgresResetCodeRepository implements ResetCodeRepository {
  constructor(private readonly pool: Pool) {}

  async replace(code: Omit<ResetCode, "tries">) {
    // One row per account: a new request replaces the old code and resets the tries
    await this.pool.query(
      `insert into password_reset_codes (user_id, code_hash, expires_at)
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
         from password_reset_codes where user_id = $1`,
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
      `update password_reset_codes set tries = tries + 1
        where user_id = $1 returning tries`,
      [userId],
    );
    return result.rows[0]?.tries ?? 0;
  }

  async remove(userId: string) {
    await this.pool.query(
      "delete from password_reset_codes where user_id = $1",
      [userId],
    );
  }
}
