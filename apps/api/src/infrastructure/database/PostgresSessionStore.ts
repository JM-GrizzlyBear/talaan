import type { Pool } from "pg";
import type { SessionStore } from "../../application/ports/SessionStore.js";

// Sessions live in connect-pg-simple's "session" table, as JSON with the user's id inside
export class PostgresSessionStore implements SessionStore {
  constructor(private readonly pool: Pool) {}

  async deleteAllSessions(userId: string, exceptSessionId?: string) {
    await this.pool.query(
      `delete from session
        where sess->>'userId' = $1 and ($2::text is null or sid <> $2)`,
      [userId, exceptSessionId ?? null],
    );
  }
}
