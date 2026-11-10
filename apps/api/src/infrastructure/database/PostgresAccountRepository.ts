import type { Pool } from "pg";
import type {
  AccountRepository,
  Suspension,
} from "../../domain/account/AccountRepository.js";

interface Row {
  id: string;
  email: string;
  first_name: string;
  suspended_at: Date;
  delete_after: Date;
  deletion_reminded_at: Date | null;
  deletion_warned_at: Date | null;
}

const SELECT = `
  select id, email, first_name, suspended_at, delete_after,
         deletion_reminded_at, deletion_warned_at
    from users`;

const toSuspension = (row: Row): Suspension => ({
  userId: row.id,
  email: row.email,
  firstName: row.first_name,
  suspendedAt: row.suspended_at,
  deleteAfter: row.delete_after,
  remindedAt: row.deletion_reminded_at,
  warnedAt: row.deletion_warned_at,
});

export class PostgresAccountRepository implements AccountRepository {
  constructor(private readonly pool: Pool) {}

  async suspend(userId: string, at: Date, deleteAfter: Date) {
    await this.pool.query(
      `update users
          set suspended_at = $2, delete_after = $3,
              deletion_reminded_at = null, deletion_warned_at = null
        where id = $1`,
      [userId, at, deleteAfter],
    );
  }

  async reactivate(userId: string) {
    const result = await this.pool.query(
      `update users
          set suspended_at = null, delete_after = null,
              deletion_reminded_at = null, deletion_warned_at = null
        where id = $1 and suspended_at is not null`,
      [userId],
    );
    return result.rowCount === 1;
  }

  async findSuspension(userId: string) {
    const result = await this.pool.query<Row>(
      `${SELECT} where id = $1 and suspended_at is not null`,
      [userId],
    );
    return result.rows[0] ? toSuspension(result.rows[0]) : null;
  }

  async listSuspended() {
    const result = await this.pool.query<Row>(
      `${SELECT} where suspended_at is not null order by delete_after`,
    );
    return result.rows.map(toSuspension);
  }

  async markReminded(userId: string, at: Date) {
    await this.pool.query(
      "update users set deletion_reminded_at = $2 where id = $1",
      [userId, at],
    );
  }

  async markWarned(userId: string, at: Date) {
    await this.pool.query(
      "update users set deletion_warned_at = $2 where id = $1",
      [userId, at],
    );
  }

  async storageKeys(ownerId: string) {
    const result = await this.pool.query<{ key: string }>(
      `select f.storage_key as key
         from record_files f join records r on r.id = f.record_id
        where r.owner_id = $1
       union all
       select photo_key as key from places
        where owner_id = $1 and photo_key is not null`,
      [ownerId],
    );
    return result.rows.map((r) => r.key);
  }

  async remove(userId: string) {
    await this.pool.query("delete from users where id = $1", [userId]);
  }
}
