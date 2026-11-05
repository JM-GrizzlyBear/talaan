import type { Pool } from "pg";
import type { TrustedBrowser } from "../../domain/trustedBrowser/TrustedBrowser.js";
import type { TrustedBrowserRepository } from "../../domain/trustedBrowser/TrustedBrowserRepository.js";

interface TrustedBrowserRow {
  id: string;
  user_id: string;
  token_hash: string;
  label: string;
  created_at: Date;
  expires_at: Date;
  last_used_at: Date;
}

const COLUMNS =
  "id, user_id, token_hash, label, created_at, expires_at, last_used_at";

function toBrowser(row: TrustedBrowserRow): TrustedBrowser {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    label: row.label,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
  };
}

export class PostgresTrustedBrowserRepository implements TrustedBrowserRepository {
  constructor(private readonly pool: Pool) {}

  async create(
    browser: Pick<
      TrustedBrowser,
      "userId" | "tokenHash" | "label" | "expiresAt"
    >,
  ) {
    const result = await this.pool.query<TrustedBrowserRow>(
      `insert into trusted_browsers (user_id, token_hash, label, expires_at)
       values ($1, $2, $3, $4)
       returning ${COLUMNS}`,
      [browser.userId, browser.tokenHash, browser.label, browser.expiresAt],
    );
    return toBrowser(result.rows[0]);
  }

  async find(id: string) {
    const result = await this.pool.query<TrustedBrowserRow>(
      `select ${COLUMNS} from trusted_browsers where id = $1`,
      [id],
    );
    return result.rows[0] ? toBrowser(result.rows[0]) : null;
  }

  async touch(id: string, at: Date) {
    await this.pool.query(
      "update trusted_browsers set last_used_at = $2 where id = $1",
      [id, at],
    );
  }

  async listActive(userId: string, now: Date) {
    const result = await this.pool.query<TrustedBrowserRow>(
      `select ${COLUMNS} from trusted_browsers
        where user_id = $1 and expires_at > $2
        order by last_used_at desc`,
      [userId, now],
    );
    return result.rows.map(toBrowser);
  }

  async remove(id: string, userId: string) {
    const result = await this.pool.query(
      "delete from trusted_browsers where id = $1 and user_id = $2",
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async removeAll(userId: string) {
    await this.pool.query("delete from trusted_browsers where user_id = $1", [
      userId,
    ]);
  }
}
