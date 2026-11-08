import type { RecordFields, RecordType } from "@talaan/shared";
import type { Pool } from "pg";
import type { HealthRecord } from "../../domain/record/HealthRecord.js";
import type {
  RecordFilters,
  RecordRepository,
} from "../../domain/record/RecordRepository.js";
import { fullNameSql } from "./sql.js";

interface RecordRow {
  id: string;
  owner_id: string;
  profile_id: string | null;
  place_id: string | null;
  type: string;
  title: string;
  record_date: string;
  doctor: string;
  facility: string;
  notes: string;
  details: unknown;
  created_by: string | null;
  created_by_name: string | null;
  created_at: Date;
  updated_by: string | null;
  updated_by_name: string | null;
  updated_at: Date;
  deleted_at: Date | null;
  deleted_by: string | null;
  deleted_by_name: string | null;
  file_count: number;
}

// Every column, the date as plain text, and the names of who added, edited and deleted it
const SELECT = `
  select r.id, r.owner_id, r.profile_id, r.place_id, r.type, r.title,
         to_char(r.record_date, 'YYYY-MM-DD') as record_date,
         r.doctor, r.facility, r.notes, r.details,
         r.created_by, ${fullNameSql("cu")} as created_by_name, r.created_at,
         r.updated_by, ${fullNameSql("uu")} as updated_by_name, r.updated_at,
         r.deleted_at, r.deleted_by, ${fullNameSql("du")} as deleted_by_name,
         (select count(*) from record_files f where f.record_id = r.id)::int as file_count
    from records r
    left join users cu on cu.id = r.created_by
    left join users uu on uu.id = r.updated_by
    left join users du on du.id = r.deleted_by`;

function toRecord(row: RecordRow): HealthRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    profileId: row.profile_id,
    placeId: row.place_id,
    type: row.type as RecordType,
    title: row.title,
    recordDate: row.record_date,
    doctor: row.doctor,
    facility: row.facility,
    notes: row.notes,
    details: row.details,
    createdBy: row.created_by,
    createdByName: row.created_by ? row.created_by_name : null,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedByName: row.updated_by ? row.updated_by_name : null,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deletedByName: row.deleted_by ? row.deleted_by_name : null,
    fileCount: row.file_count,
  } as HealthRecord;
}

// The most a list returns for now (paging comes with search)
const LIST_LIMIT = 500;

export class PostgresRecordRepository implements RecordRepository {
  constructor(private readonly pool: Pool) {}

  private async many(sql: string, values: unknown[]) {
    const result = await this.pool.query<RecordRow>(sql, values);
    return result.rows.map(toRecord);
  }

  private async mustFind(id: string) {
    const record = await this.findById(id);
    if (!record) throw new Error(`Record ${id} disappeared`);
    return record;
  }

  async listForOwner(ownerId: string, filters: RecordFilters) {
    const where = ["r.owner_id = $1", "r.deleted_at is null"];
    const values: unknown[] = [ownerId];
    if (filters.profileId === null) where.push("r.profile_id is null");
    if (typeof filters.profileId === "string") {
      values.push(filters.profileId);
      where.push(`r.profile_id = $${values.length}`);
    }
    if (filters.type) {
      values.push(filters.type);
      where.push(`r.type = $${values.length}`);
    }
    if (filters.placeId) {
      values.push(filters.placeId);
      where.push(`r.place_id = $${values.length}`);
    }
    return await this.many(
      `${SELECT} where ${where.join(" and ")}
        order by r.record_date desc, r.created_at desc
        limit ${LIST_LIMIT}`,
      values,
    );
  }

  async findById(id: string) {
    const rows = await this.many(`${SELECT} where r.id = $1`, [id]);
    return rows[0] ?? null;
  }

  async create(
    ownerId: string,
    fields: RecordFields,
    actorId: string,
    at: Date,
  ) {
    const result = await this.pool.query<{ id: string }>(
      `insert into records
         (owner_id, profile_id, type, title, record_date, doctor, facility, notes, details,
          created_by, created_at, updated_by, updated_at, place_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $10, $11, $12)
       returning id`,
      [
        ownerId,
        fields.profileId,
        fields.type,
        fields.title,
        fields.recordDate,
        fields.doctor,
        fields.facility,
        fields.notes,
        JSON.stringify(fields.details),
        actorId,
        at,
        fields.placeId,
      ],
    );
    return await this.mustFind(result.rows[0].id);
  }

  async update(id: string, fields: RecordFields, actorId: string, at: Date) {
    await this.pool.query(
      `update records
          set profile_id = $2, type = $3, title = $4, record_date = $5,
              doctor = $6, facility = $7, notes = $8, details = $9,
              updated_by = $10, updated_at = $11, place_id = $12
        where id = $1`,
      [
        id,
        fields.profileId,
        fields.type,
        fields.title,
        fields.recordDate,
        fields.doctor,
        fields.facility,
        fields.notes,
        JSON.stringify(fields.details),
        actorId,
        at,
        fields.placeId,
      ],
    );
    return await this.mustFind(id);
  }

  async moveToTrash(id: string, actorId: string, at: Date) {
    await this.pool.query(
      "update records set deleted_at = $3, deleted_by = $2 where id = $1",
      [id, actorId, at],
    );
  }

  async restore(id: string, actorId: string, at: Date) {
    await this.pool.query(
      `update records
          set deleted_at = null, deleted_by = null, updated_by = $2, updated_at = $3
        where id = $1`,
      [id, actorId, at],
    );
  }

  async listTrash(ownerId: string) {
    return await this.many(
      `${SELECT} where r.owner_id = $1 and r.deleted_at is not null
        order by r.deleted_at desc`,
      [ownerId],
    );
  }

  async listTrashedBefore(before: Date) {
    return await this.many(
      `${SELECT} where r.deleted_at is not null and r.deleted_at <= $1`,
      [before],
    );
  }

  async remove(id: string) {
    await this.pool.query("delete from records where id = $1", [id]);
  }

  async countForProfile(profileId: string) {
    const result = await this.pool.query<{ n: number }>(
      "select count(*)::int as n from records where profile_id = $1",
      [profileId],
    );
    return result.rows[0].n;
  }
}
