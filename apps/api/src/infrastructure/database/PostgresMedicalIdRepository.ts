import {
  type EmergencyExtra,
  fullName,
  type MedicalIdFields,
  medicalIdSchema,
} from "@talaan/shared";
import type { Pool } from "pg";
import type {
  MedicalId,
  MedicalIdRepository,
} from "../../domain/medical/MedicalId.js";

interface Row {
  owner_id: string;
  profile_id: string | null;
  fields: unknown;
  checked_at: Date;
  emergency_on: boolean;
  emergency_token: string | null;
  emergency_extras: EmergencyExtra[];
  updated_at: Date;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
}

const SELECT = `
  select m.*, u.first_name, u.middle_name, u.last_name
    from medical_ids m
    left join users u on u.id = m.updated_by`;

function toMedicalId(row: Row): MedicalId {
  return {
    ownerId: row.owner_id,
    profileId: row.profile_id,
    // Saved fields read back through the rules, so newer fields get defaults
    fields: medicalIdSchema.parse(row.fields),
    checkedAt: row.checked_at,
    emergencyOn: row.emergency_on,
    emergencyToken: row.emergency_token,
    emergencyExtras: row.emergency_extras,
    updatedByName: row.first_name
      ? fullName({
          firstName: row.first_name,
          middleName: row.middle_name,
          lastName: row.last_name ?? "",
        })
      : null,
    updatedAt: row.updated_at,
  };
}

// "profile_id = $2" doesn't match null; this does
const PERSON = "m.owner_id = $1 and m.profile_id is not distinct from $2";

export class PostgresMedicalIdRepository implements MedicalIdRepository {
  constructor(private readonly pool: Pool) {}

  async find(ownerId: string, profileId: string | null) {
    const result = await this.pool.query<Row>(`${SELECT} where ${PERSON}`, [
      ownerId,
      profileId,
    ]);
    return result.rows[0] ? toMedicalId(result.rows[0]) : null;
  }

  async listForOwner(ownerId: string) {
    const result = await this.pool.query<Row>(
      `${SELECT} where m.owner_id = $1`,
      [ownerId],
    );
    return result.rows.map(toMedicalId);
  }

  async save(
    ownerId: string,
    profileId: string | null,
    fields: MedicalIdFields,
    actorId: string,
    at: Date,
  ) {
    await this.pool.query(
      `insert into medical_ids
         (owner_id, profile_id, fields, checked_at, created_by, created_at,
          updated_by, updated_at)
       values ($1, $2, $3, $4, $5, $4, $5, $4)
       on conflict (owner_id, profile_id) do update
         set fields = excluded.fields, checked_at = excluded.checked_at,
             updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
      [ownerId, profileId, JSON.stringify(fields), at, actorId],
    );
  }

  async markChecked(ownerId: string, profileId: string | null, at: Date) {
    await this.pool.query(
      `update medical_ids m set checked_at = $3 where ${PERSON}`,
      [ownerId, profileId, at],
    );
  }

  async setEmergency(
    ownerId: string,
    profileId: string | null,
    emergency: { on: boolean; token: string | null; extras: EmergencyExtra[] },
    actorId: string,
    at: Date,
  ) {
    // An ID not filled in yet can still have its QR turned on
    await this.pool.query(
      `insert into medical_ids
         (owner_id, profile_id, fields, checked_at, emergency_on,
          emergency_token, emergency_extras, created_by, created_at,
          updated_by, updated_at)
       values ($1, $2, '{}', $3, $4, $5, $6, $7, $3, $7, $3)
       on conflict (owner_id, profile_id) do update
         set emergency_on = excluded.emergency_on,
             emergency_token = excluded.emergency_token,
             emergency_extras = excluded.emergency_extras,
             updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
      [
        ownerId,
        profileId,
        at,
        emergency.on,
        emergency.token,
        JSON.stringify(emergency.extras),
        actorId,
      ],
    );
  }

  async findByEmergencyToken(token: string) {
    const result = await this.pool.query<
      Row & {
        person_first: string;
        person_middle: string | null;
        person_last: string;
      }
    >(
      `${SELECT.replace("select m.*,", "select m.*, coalesce(p.first_name, o.first_name) as person_first, case when p.id is null then o.middle_name else p.middle_name end as person_middle, coalesce(p.last_name, o.last_name) as person_last,")}
         join users o on o.id = m.owner_id
         left join family_profiles p on p.id = m.profile_id
        where m.emergency_token = $1 and m.emergency_on`,
      [token],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      medicalId: toMedicalId(row),
      firstName: row.person_first,
      middleName: row.person_middle,
      lastName: row.person_last,
    };
  }
}
