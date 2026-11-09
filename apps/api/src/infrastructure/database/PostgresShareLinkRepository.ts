import { fullName } from "@talaan/shared";
import type { Pool } from "pg";
import type {
  NewShareLink,
  ShareLink,
  ShareLinkRepository,
} from "../../domain/share/ShareLink.js";

interface Row {
  id: string;
  owner_id: string;
  profile_id: string | null;
  token: string;
  recipient: string;
  note: string;
  include_medical_id: boolean;
  include_labs: boolean;
  record_ids: string[];
  expires_at: Date;
  max_views: number | null;
  pin_hash: string | null;
  pin_failures: number;
  pin_wait_until: Date | null;
  alerted_at: Date | null;
  stopped_at: Date | null;
  created_by: string | null;
  created_at: Date;
  created_first: string | null;
  created_middle: string | null;
  created_last: string | null;
  stopped_first: string | null;
  stopped_middle: string | null;
  stopped_last: string | null;
  views: { opened_at: string; device: string }[];
}

const SELECT = `
  select s.*,
         cu.first_name as created_first, cu.middle_name as created_middle,
         cu.last_name as created_last,
         su.first_name as stopped_first, su.middle_name as stopped_middle,
         su.last_name as stopped_last,
         coalesce((select json_agg(json_build_object('opened_at', v.opened_at,
                                                     'device', v.device)
                                   order by v.opened_at desc)
                     from share_link_views v where v.share_id = s.id), '[]') as views
    from share_links s
    left join users cu on cu.id = s.created_by
    left join users su on su.id = s.stopped_by`;

const nameOf = (
  first: string | null,
  middle: string | null,
  last: string | null,
) =>
  first
    ? fullName({ firstName: first, middleName: middle, lastName: last ?? "" })
    : null;

function toShareLink(row: Row): ShareLink {
  return {
    id: row.id,
    ownerId: row.owner_id,
    profileId: row.profile_id,
    token: row.token,
    recipient: row.recipient,
    note: row.note,
    medicalId: row.include_medical_id,
    labs: row.include_labs,
    recordIds: row.record_ids,
    expiresAt: row.expires_at,
    maxViews: row.max_views,
    pinHash: row.pin_hash,
    pinFailures: row.pin_failures,
    pinWaitUntil: row.pin_wait_until,
    alertedAt: row.alerted_at,
    stoppedAt: row.stopped_at,
    stoppedByName: nameOf(
      row.stopped_first,
      row.stopped_middle,
      row.stopped_last,
    ),
    createdBy: row.created_by,
    createdByName: nameOf(
      row.created_first,
      row.created_middle,
      row.created_last,
    ),
    createdAt: row.created_at,
    views: row.views.map((v) => ({
      openedAt: new Date(v.opened_at),
      device: v.device,
    })),
  };
}

export class PostgresShareLinkRepository implements ShareLinkRepository {
  constructor(private readonly pool: Pool) {}

  private async one(where: string, value: string) {
    const result = await this.pool.query<Row>(`${SELECT} where ${where}`, [
      value,
    ]);
    return result.rows[0] ? toShareLink(result.rows[0]) : null;
  }

  async listForOwner(ownerId: string) {
    const result = await this.pool.query<Row>(
      `${SELECT} where s.owner_id = $1 order by s.created_at desc`,
      [ownerId],
    );
    return result.rows.map(toShareLink);
  }

  async findById(id: string) {
    return await this.one("s.id = $1", id);
  }

  async findByToken(token: string) {
    return await this.one("s.token = $1", token);
  }

  async countOpen(ownerId: string, now: Date) {
    const result = await this.pool.query<{ count: string }>(
      `select count(*) from share_links
        where owner_id = $1 and stopped_at is null and expires_at > $2`,
      [ownerId, now],
    );
    return Number(result.rows[0].count);
  }

  async create(link: NewShareLink, actorId: string, at: Date) {
    const result = await this.pool.query<{ id: string }>(
      `insert into share_links
         (owner_id, profile_id, token, recipient, note, include_medical_id,
          include_labs, record_ids, expires_at, max_views, pin_hash,
          created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
       returning id`,
      [
        link.ownerId,
        link.profileId,
        link.token,
        link.recipient,
        link.note,
        link.medicalId,
        link.labs,
        link.recordIds,
        link.expiresAt,
        link.maxViews,
        link.pinHash,
        actorId,
        at,
      ],
    );
    return result.rows[0].id;
  }

  async updateSettings(
    id: string,
    settings: {
      expiresAt: Date;
      maxViews: number | null;
      pinHash?: string | null;
    },
    at: Date,
  ) {
    const changePin = settings.pinHash !== undefined;
    await this.pool.query(
      `update share_links
          set expires_at = $2, max_views = $3, updated_at = $4,
              pin_hash = case when $5 then $6 else pin_hash end,
              pin_failures = case when $5 then 0 else pin_failures end,
              pin_wait_until = case when $5 then null else pin_wait_until end
        where id = $1`,
      [
        id,
        settings.expiresAt,
        settings.maxViews,
        at,
        changePin,
        settings.pinHash ?? null,
      ],
    );
  }

  async stop(id: string, actorId: string, at: Date) {
    await this.pool.query(
      `update share_links set stopped_at = $3, stopped_by = $2, updated_at = $3
        where id = $1 and stopped_at is null`,
      [id, actorId, at],
    );
  }

  async remove(id: string) {
    await this.pool.query("delete from share_links where id = $1", [id]);
  }

  async setPinFailures(id: string, failures: number, waitUntil: Date | null) {
    await this.pool.query(
      "update share_links set pin_failures = $2, pin_wait_until = $3 where id = $1",
      [id, failures, waitUntil],
    );
  }

  async addView(shareId: string, keyHash: string, device: string, at: Date) {
    await this.pool.query(
      `insert into share_link_views (share_id, key_hash, device, opened_at)
       values ($1, $2, $3, $4)`,
      [shareId, keyHash, device, at],
    );
  }

  async hasView(shareId: string, keyHash: string) {
    const result = await this.pool.query(
      "select 1 from share_link_views where share_id = $1 and key_hash = $2",
      [shareId, keyHash],
    );
    return result.rowCount === 1;
  }

  async claimAlert(id: string, at: Date, notBefore: Date) {
    const result = await this.pool.query(
      `update share_links set alerted_at = $2
        where id = $1 and (alerted_at is null or alerted_at < $3)`,
      [id, at, notBefore],
    );
    return result.rowCount === 1;
  }
}
