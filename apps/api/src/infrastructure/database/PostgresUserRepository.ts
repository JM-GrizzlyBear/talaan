import type { LockAfterMinutes } from "@talaan/shared";
import type { Pool } from "pg";
import type { User } from "../../domain/user/User.js";
import type {
  NewUser,
  UserRepository,
} from "../../domain/user/UserRepository.js";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  lock_after_minutes: number;
  privacy_consent_at: Date;
  password_changed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS =
  "id, name, email, password_hash, lock_after_minutes, privacy_consent_at, password_changed_at, created_at, updated_at";

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    lockAfterMinutes: row.lock_after_minutes as LockAfterMinutes,
    privacyConsentAt: row.privacy_consent_at,
    passwordChangedAt: row.password_changed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  private async findOne(where: string, value: string) {
    const result = await this.pool.query<UserRow>(
      `select ${COLUMNS} from users where ${where} = $1`,
      [value],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  async findById(id: string) {
    return await this.findOne("id", id);
  }

  async findByEmail(email: string) {
    return await this.findOne("email", email);
  }

  async create(user: NewUser) {
    const result = await this.pool.query<UserRow>(
      `insert into users (name, email, password_hash, privacy_consent_at)
       values ($1, $2, $3, $4)
       returning ${COLUMNS}`,
      [user.name, user.email, user.passwordHash, user.privacyConsentAt],
    );
    return toUser(result.rows[0]);
  }

  async updatePassword(id: string, passwordHash: string, changedAt: Date) {
    await this.pool.query(
      `update users
          set password_hash = $2, password_changed_at = $3, updated_at = $3
        where id = $1`,
      [id, passwordHash, changedAt],
    );
  }

  async updateLockAfter(id: string, minutes: LockAfterMinutes) {
    const result = await this.pool.query<UserRow>(
      `update users set lock_after_minutes = $2, updated_at = now()
        where id = $1
        returning ${COLUMNS}`,
      [id, minutes],
    );
    return toUser(result.rows[0]);
  }
}
