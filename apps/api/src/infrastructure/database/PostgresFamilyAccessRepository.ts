import type { AccessLevel, FamilyRelationship } from "@talaan/shared";
import type { Pool } from "pg";
import type {
  FamilyAccess,
  FamilyAccessWithPerson,
} from "../../domain/family/FamilyAccess.js";
import type { FamilyAccessRepository } from "../../domain/family/FamilyAccessRepository.js";

interface AccessRow {
  owner_id: string;
  member_id: string;
  relationship: string;
  access: string;
  created_at: Date;
}

interface AccessWithPersonRow extends AccessRow {
  person_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
}

function toAccess(row: AccessRow): FamilyAccess {
  return {
    ownerId: row.owner_id,
    memberId: row.member_id,
    relationship: row.relationship as FamilyRelationship,
    access: row.access as AccessLevel,
    createdAt: row.created_at,
  };
}

function toAccessWithPerson(row: AccessWithPersonRow): FamilyAccessWithPerson {
  return {
    ...toAccess(row),
    person: {
      id: row.person_id,
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      email: row.email,
    },
  };
}

// The access row plus the other person's name and email
const WITH_PERSON = (personColumn: "member_id" | "owner_id") => `
  select a.owner_id, a.member_id, a.relationship, a.access, a.created_at,
         u.id as person_id, u.first_name, u.middle_name, u.last_name, u.email
    from family_access a
    join users u on u.id = a.${personColumn}`;

export class PostgresFamilyAccessRepository implements FamilyAccessRepository {
  constructor(private readonly pool: Pool) {}

  async find(ownerId: string, memberId: string) {
    const result = await this.pool.query<AccessRow>(
      `select owner_id, member_id, relationship, access, created_at
         from family_access where owner_id = $1 and member_id = $2`,
      [ownerId, memberId],
    );
    return result.rows[0] ? toAccess(result.rows[0]) : null;
  }

  async save(access: Omit<FamilyAccess, "createdAt">) {
    await this.pool.query(
      `insert into family_access (owner_id, member_id, relationship, access)
       values ($1, $2, $3, $4)
       on conflict (owner_id, member_id)
       do update set relationship = excluded.relationship,
                     access = excluded.access,
                     updated_at = now()`,
      [access.ownerId, access.memberId, access.relationship, access.access],
    );
  }

  async listMembers(ownerId: string) {
    const result = await this.pool.query<AccessWithPersonRow>(
      `${WITH_PERSON("member_id")} where a.owner_id = $1 order by a.created_at`,
      [ownerId],
    );
    return result.rows.map(toAccessWithPerson);
  }

  async listOwners(memberId: string) {
    const result = await this.pool.query<AccessWithPersonRow>(
      `${WITH_PERSON("owner_id")} where a.member_id = $1 order by a.created_at`,
      [memberId],
    );
    return result.rows.map(toAccessWithPerson);
  }

  async countMembers(ownerId: string) {
    const result = await this.pool.query<{ n: number }>(
      "select count(*)::int as n from family_access where owner_id = $1",
      [ownerId],
    );
    return result.rows[0].n;
  }

  async hasMemberWithEmail(ownerId: string, email: string) {
    const result = await this.pool.query(
      `select 1 from family_access a join users u on u.id = a.member_id
        where a.owner_id = $1 and u.email = $2`,
      [ownerId, email],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async updateAccess(ownerId: string, memberId: string, access: AccessLevel) {
    const result = await this.pool.query(
      `update family_access set access = $3, updated_at = now()
        where owner_id = $1 and member_id = $2`,
      [ownerId, memberId, access],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async remove(ownerId: string, memberId: string) {
    const result = await this.pool.query(
      "delete from family_access where owner_id = $1 and member_id = $2",
      [ownerId, memberId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
