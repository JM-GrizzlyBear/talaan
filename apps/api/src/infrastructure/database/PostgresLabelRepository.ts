import type { Pool } from "pg";
import type { Label } from "../../domain/place/Place.js";
import type { LabelRepository } from "../../domain/place/PlaceRepository.js";

interface LabelRow {
  code: string;
  owner_id: string;
  place_id: string | null;
  created_at: Date;
}

const toLabel = (row: LabelRow): Label => ({
  code: row.code,
  ownerId: row.owner_id,
  placeId: row.place_id,
  createdAt: row.created_at,
});

export class PostgresLabelRepository implements LabelRepository {
  constructor(private readonly pool: Pool) {}

  async findByCode(code: string) {
    const result = await this.pool.query<LabelRow>(
      "select code, owner_id, place_id, created_at from labels where code = $1",
      [code],
    );
    return result.rows[0] ? toLabel(result.rows[0]) : null;
  }

  async addBlank(ownerId: string, codes: string[], actorId: string, at: Date) {
    // All or none: a taken code means trying again with new ones
    const result = await this.pool.query(
      `insert into labels (code, owner_id, created_by, created_at)
       select code, $2, $3, $4 from unnest($1::text[]) as code
       on conflict (code) do nothing`,
      [codes, ownerId, actorId, at],
    );
    if (result.rowCount === codes.length) return true;
    await this.pool.query(
      `delete from labels
        where code = any($1::text[]) and place_id is null
          and owner_id = $2 and created_at = $3`,
      [codes, ownerId, at],
    );
    return false;
  }

  async listBlank(ownerId: string) {
    const result = await this.pool.query<LabelRow>(
      `select code, owner_id, place_id, created_at from labels
        where owner_id = $1 and place_id is null
        order by created_at desc, code`,
      [ownerId],
    );
    return result.rows.map(toLabel);
  }

  async countBlank(ownerId: string) {
    const result = await this.pool.query<{ n: number }>(
      "select count(*)::int as n from labels where owner_id = $1 and place_id is null",
      [ownerId],
    );
    return result.rows[0].n;
  }

  async isFree(code: string) {
    const result = await this.pool.query(
      "select 1 from labels where code = $1",
      [code],
    );
    return result.rowCount === 0;
  }
}
