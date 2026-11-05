import type { Pool } from "pg";
import type { NewPasskey, Passkey } from "../../domain/passkey/Passkey.js";
import type { PasskeyRepository } from "../../domain/passkey/PasskeyRepository.js";

interface PasskeyRow {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: Buffer;
  counter: string;
  transports: string[];
  device_type: string;
  backed_up: boolean;
  name: string;
  created_at: Date;
  last_used_at: Date | null;
}

const COLUMNS =
  "id, user_id, credential_id, public_key, counter, transports, device_type, backed_up, name, created_at, last_used_at";

function toPasskey(row: PasskeyRow): Passkey {
  return {
    id: row.id,
    userId: row.user_id,
    credentialId: row.credential_id,
    publicKey: new Uint8Array(row.public_key),
    // bigint comes back as a string; counters stay far below 2^53
    counter: Number(row.counter),
    transports: row.transports,
    deviceType: row.device_type,
    backedUp: row.backed_up,
    name: row.name,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

export class PostgresPasskeyRepository implements PasskeyRepository {
  constructor(private readonly pool: Pool) {}

  async listForUser(userId: string) {
    const result = await this.pool.query<PasskeyRow>(
      `select ${COLUMNS} from passkeys where user_id = $1 order by created_at`,
      [userId],
    );
    return result.rows.map(toPasskey);
  }

  async findByCredentialId(credentialId: string) {
    const result = await this.pool.query<PasskeyRow>(
      `select ${COLUMNS} from passkeys where credential_id = $1`,
      [credentialId],
    );
    return result.rows[0] ? toPasskey(result.rows[0]) : null;
  }

  async create(passkey: NewPasskey) {
    const result = await this.pool.query<PasskeyRow>(
      `insert into passkeys
         (user_id, credential_id, public_key, counter, transports, device_type, backed_up, name)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning ${COLUMNS}`,
      [
        passkey.userId,
        passkey.credentialId,
        Buffer.from(passkey.publicKey),
        passkey.counter,
        passkey.transports,
        passkey.deviceType,
        passkey.backedUp,
        passkey.name,
      ],
    );
    return toPasskey(result.rows[0]);
  }

  async recordUse(id: string, counter: number, at: Date) {
    await this.pool.query(
      "update passkeys set counter = $2, last_used_at = $3 where id = $1",
      [id, counter, at],
    );
  }

  async remove(id: string, userId: string) {
    const result = await this.pool.query(
      "delete from passkeys where id = $1 and user_id = $2",
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
