import type { PlaceFields, PlaceKind } from "@talaan/shared";
import type { Pool } from "pg";
import { ForbiddenError } from "../../domain/errors.js";
import type { Place, PlacePhoto } from "../../domain/place/Place.js";
import type { PlaceRepository } from "../../domain/place/PlaceRepository.js";
import { fullNameSql } from "./sql.js";
import { inTransaction } from "./transaction.js";

interface PlaceRow {
  id: string;
  owner_id: string;
  parent_id: string | null;
  kind: string;
  name: string;
  note: string;
  code: string;
  photo_key: string | null;
  photo_format: string | null;
  photo_width: number | null;
  photo_height: number | null;
  record_count: number;
  place_count: number;
  created_by_name: string | null;
  updated_by_name: string | null;
  updated_at: Date;
}

// With its label, how much is directly inside, and who added and changed it.
// Records in the Trash aren't counted.
const SELECT = `
  select p.id, p.owner_id, p.parent_id, p.kind, p.name, p.note, l.code,
         p.photo_key, p.photo_format, p.photo_width, p.photo_height,
         (select count(*) from records r
           where r.place_id = p.id and r.deleted_at is null)::int as record_count,
         (select count(*) from places c where c.parent_id = p.id)::int as place_count,
         case when p.created_by is null then null else ${fullNameSql("cu")} end as created_by_name,
         case when p.updated_by is null then null else ${fullNameSql("uu")} end as updated_by_name,
         p.updated_at
    from places p
    join labels l on l.place_id = p.id
    left join users cu on cu.id = p.created_by
    left join users uu on uu.id = p.updated_by`;

function toPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    ownerId: row.owner_id,
    parentId: row.parent_id,
    kind: row.kind as PlaceKind,
    name: row.name,
    note: row.note,
    code: row.code,
    photo:
      row.photo_key && row.photo_format
        ? {
            key: row.photo_key,
            format: row.photo_format as PlacePhoto["format"],
            width: row.photo_width,
            height: row.photo_height,
          }
        : null,
    recordCount: row.record_count,
    placeCount: row.place_count,
    createdByName: row.created_by_name,
    updatedByName: row.updated_by_name,
    updatedAt: row.updated_at,
  };
}

const TAKEN = "Someone just named this label. Scan it again to see it.";

export class PostgresPlaceRepository implements PlaceRepository {
  constructor(private readonly pool: Pool) {}

  async listForOwner(ownerId: string) {
    const result = await this.pool.query<PlaceRow>(
      `${SELECT} where p.owner_id = $1 order by lower(p.name), p.created_at`,
      [ownerId],
    );
    return result.rows.map(toPlace);
  }

  async findById(id: string) {
    const result = await this.pool.query<PlaceRow>(
      `${SELECT} where p.id = $1`,
      [id],
    );
    return result.rows[0] ? toPlace(result.rows[0]) : null;
  }

  async countForOwner(ownerId: string) {
    const result = await this.pool.query<{ n: number }>(
      "select count(*)::int as n from places where owner_id = $1",
      [ownerId],
    );
    return result.rows[0].n;
  }

  async create(
    ownerId: string,
    fields: PlaceFields,
    code: string,
    actorId: string,
    at: Date,
  ) {
    const id = await inTransaction(this.pool, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `insert into places
           (owner_id, parent_id, kind, name, note,
            created_by, created_at, updated_by, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $6, $7)
         returning id`,
        [
          ownerId,
          fields.parentId,
          fields.kind,
          fields.name,
          fields.note,
          actorId,
          at,
        ],
      );
      const placeId = inserted.rows[0].id;
      // A blank label of this account gets its place; otherwise a new label
      const label = await client.query(
        `insert into labels (code, owner_id, place_id, created_by, created_at)
         values ($1, $2, $3, $4, $5)
         on conflict (code) do update set place_id = excluded.place_id
           where labels.place_id is null and labels.owner_id = excluded.owner_id`,
        [code, ownerId, placeId, actorId, at],
      );
      if (label.rowCount !== 1) throw new ForbiddenError(TAKEN);
      return placeId;
    });
    return (await this.findById(id))!;
  }

  async update(id: string, fields: PlaceFields, actorId: string, at: Date) {
    await this.pool.query(
      `update places
          set parent_id = $2, kind = $3, name = $4, note = $5,
              updated_by = $6, updated_at = $7
        where id = $1`,
      [id, fields.parentId, fields.kind, fields.name, fields.note, actorId, at],
    );
    return (await this.findById(id))!;
  }

  async setPhoto(
    id: string,
    photo: PlacePhoto | null,
    actorId: string,
    at: Date,
  ) {
    await this.pool.query(
      `update places
          set photo_key = $2, photo_format = $3, photo_width = $4,
              photo_height = $5, updated_by = $6, updated_at = $7
        where id = $1`,
      [
        id,
        photo?.key ?? null,
        photo?.format ?? null,
        photo?.width ?? null,
        photo?.height ?? null,
        actorId,
        at,
      ],
    );
  }

  async remove(id: string) {
    await inTransaction(this.pool, async (client) => {
      const found = await client.query<{ parent_id: string | null }>(
        "select parent_id from places where id = $1 for update",
        [id],
      );
      if (found.rowCount === 0) return;
      const parentId = found.rows[0].parent_id;
      await client.query(
        "update places set parent_id = $2 where parent_id = $1",
        [id, parentId],
      );
      await client.query(
        "update records set place_id = $2 where place_id = $1",
        [id, parentId],
      );
      // Its label becomes blank (on delete set null)
      await client.query("delete from places where id = $1", [id]);
    });
  }
}
