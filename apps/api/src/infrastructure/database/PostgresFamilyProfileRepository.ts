import type { FamilyRelationship } from "@talaan/shared";
import type { Pool } from "pg";
import type {
  FamilyProfile,
  FamilyProfileFields,
} from "../../domain/family/FamilyProfile.js";
import type { FamilyProfileRepository } from "../../domain/family/FamilyProfileRepository.js";

interface ProfileRow {
  id: string;
  owner_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  relationship: string;
  birth_date: string | null;
  created_at: Date;
  updated_at: Date;
}

// birth_date comes back as text ("YYYY-MM-DD"), never shifted by time zones
const COLUMNS =
  "id, owner_id, first_name, middle_name, last_name, relationship, to_char(birth_date, 'YYYY-MM-DD') as birth_date, created_at, updated_at";

function toProfile(row: ProfileRow): FamilyProfile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    relationship: row.relationship as FamilyRelationship,
    birthDate: row.birth_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresFamilyProfileRepository implements FamilyProfileRepository {
  constructor(private readonly pool: Pool) {}

  async listForOwners(ownerIds: string[]) {
    if (ownerIds.length === 0) return [];
    const result = await this.pool.query<ProfileRow>(
      `select ${COLUMNS} from family_profiles
        where owner_id = any($1::uuid[])
        order by created_at`,
      [ownerIds],
    );
    return result.rows.map(toProfile);
  }

  async countForOwner(ownerId: string) {
    const result = await this.pool.query<{ n: number }>(
      "select count(*)::int as n from family_profiles where owner_id = $1",
      [ownerId],
    );
    return result.rows[0].n;
  }

  async create(ownerId: string, fields: FamilyProfileFields) {
    const result = await this.pool.query<ProfileRow>(
      `insert into family_profiles (owner_id, first_name, middle_name, last_name, relationship, birth_date)
       values ($1, $2, $3, $4, $5, $6)
       returning ${COLUMNS}`,
      [
        ownerId,
        fields.firstName,
        fields.middleName,
        fields.lastName,
        fields.relationship,
        fields.birthDate,
      ],
    );
    return toProfile(result.rows[0]);
  }

  async update(id: string, ownerId: string, fields: FamilyProfileFields) {
    const result = await this.pool.query<ProfileRow>(
      `update family_profiles
          set first_name = $3, middle_name = $4, last_name = $5,
              relationship = $6, birth_date = $7, updated_at = now()
        where id = $1 and owner_id = $2
        returning ${COLUMNS}`,
      [
        id,
        ownerId,
        fields.firstName,
        fields.middleName,
        fields.lastName,
        fields.relationship,
        fields.birthDate,
      ],
    );
    return result.rows[0] ? toProfile(result.rows[0]) : null;
  }

  async remove(id: string, ownerId: string) {
    const result = await this.pool.query(
      "delete from family_profiles where id = $1 and owner_id = $2",
      [id, ownerId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
