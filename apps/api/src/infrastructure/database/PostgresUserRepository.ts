import {
  type Appearance,
  appearanceSchema,
  DEFAULT_APPEARANCE,
  type LockAfterMinutes,
} from "@talaan/shared";
import type { Pool } from "pg";
import type { User } from "../../domain/user/User.js";
import type {
  NewUser,
  UserRepository,
} from "../../domain/user/UserRepository.js";

interface UserRow {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  password_hash: string;
  lock_after_minutes: number;
  two_step_enabled: boolean;
  passkey_count: number;
  appearance: unknown;
  privacy_consent_at: Date;
  password_changed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Every user column, plus how many passkeys they have
const SELECT = `
  select u.id, u.first_name, u.middle_name, u.last_name, u.email, u.password_hash,
         u.lock_after_minutes, u.two_step_enabled, u.appearance, u.privacy_consent_at,
         u.password_changed_at, u.created_at, u.updated_at,
         (select count(*) from passkeys p where p.user_id = u.id)::int as passkey_count
    from users u`;

function toUser(row: UserRow): User {
  return {
    id: row.id,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    email: row.email,
    passwordHash: row.password_hash,
    lockAfterMinutes: row.lock_after_minutes as LockAfterMinutes,
    twoStepEnabled: row.two_step_enabled,
    passkeyCount: row.passkey_count,
    // A saved look that no longer fits (a removed color set) falls back
    appearance:
      appearanceSchema.safeParse(row.appearance ?? {}).data ??
      DEFAULT_APPEARANCE,
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
      `${SELECT} where u.${where} = $1`,
      [value],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  private async mustFind(id: string) {
    const user = await this.findById(id);
    if (!user) throw new Error(`User ${id} disappeared`);
    return user;
  }

  async findById(id: string) {
    return await this.findOne("id", id);
  }

  async findByEmail(email: string) {
    return await this.findOne("email", email);
  }

  async create(user: NewUser) {
    const result = await this.pool.query<{ id: string }>(
      `insert into users (first_name, middle_name, last_name, email, password_hash, privacy_consent_at)
       values ($1, $2, $3, $4, $5, $6)
       returning id`,
      [
        user.firstName,
        user.middleName,
        user.lastName,
        user.email,
        user.passwordHash,
        user.privacyConsentAt,
      ],
    );
    return await this.mustFind(result.rows[0].id);
  }

  async updatePassword(id: string, passwordHash: string, changedAt: Date) {
    await this.pool.query(
      `update users
          set password_hash = $2, password_changed_at = $3, updated_at = $3
        where id = $1`,
      [id, passwordHash, changedAt],
    );
  }

  async updateAppearance(id: string, appearance: Appearance) {
    await this.pool.query(
      "update users set appearance = $2, updated_at = now() where id = $1",
      [id, JSON.stringify(appearance)],
    );
    return await this.mustFind(id);
  }

  async updateSecurity(
    id: string,
    settings: { lockAfterMinutes?: LockAfterMinutes; twoStepEnabled?: boolean },
  ) {
    // Only the settings that were given change; the others keep their value
    await this.pool.query(
      `update users
          set lock_after_minutes = coalesce($2, lock_after_minutes),
              two_step_enabled = coalesce($3, two_step_enabled),
              updated_at = now()
        where id = $1`,
      [id, settings.lockAfterMinutes ?? null, settings.twoStepEnabled ?? null],
    );
    return await this.mustFind(id);
  }
}
