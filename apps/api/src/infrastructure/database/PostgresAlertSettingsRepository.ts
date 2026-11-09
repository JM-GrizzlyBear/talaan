import type { Pool } from "pg";
import type { PushDevice } from "../../domain/reminder/Reminder.js";
import type { AlertSettingsRepository } from "../../domain/reminder/ReminderRepository.js";

interface DeviceRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  label: string;
  created_at: Date;
}

const toDevice = (row: DeviceRow): PushDevice => ({
  id: row.id,
  userId: row.user_id,
  endpoint: row.endpoint,
  p256dh: row.p256dh,
  auth: row.auth,
  label: row.label,
  createdAt: row.created_at,
});

export class PostgresAlertSettingsRepository implements AlertSettingsRepository {
  constructor(private readonly pool: Pool) {}

  async get(userId: string) {
    const result = await this.pool.query<{
      alert_email: boolean;
      alert_push: boolean;
    }>("select alert_email, alert_push from users where id = $1", [userId]);
    const row = result.rows[0];
    return { email: row?.alert_email ?? true, push: row?.alert_push ?? true };
  }

  async set(userId: string, settings: { email: boolean; push: boolean }) {
    await this.pool.query(
      "update users set alert_email = $2, alert_push = $3 where id = $1",
      [userId, settings.email, settings.push],
    );
  }

  async devices(userId: string) {
    const result = await this.pool.query<DeviceRow>(
      "select * from push_subscriptions where user_id = $1 order by created_at",
      [userId],
    );
    return result.rows.map(toDevice);
  }

  // The same browser signing up again (or for another person) takes it over
  async addDevice(
    userId: string,
    device: { endpoint: string; p256dh: string; auth: string; label: string },
  ) {
    const result = await this.pool.query<DeviceRow>(
      `insert into push_subscriptions (user_id, endpoint, p256dh, auth, label)
       values ($1, $2, $3, $4, $5)
       on conflict (endpoint) do update
         set user_id = excluded.user_id, p256dh = excluded.p256dh,
             auth = excluded.auth, label = excluded.label
       returning *`,
      [userId, device.endpoint, device.p256dh, device.auth, device.label],
    );
    return toDevice(result.rows[0]);
  }

  async removeDevice(userId: string, id: string) {
    const result = await this.pool.query(
      "delete from push_subscriptions where id = $1 and user_id = $2",
      [id, userId],
    );
    return result.rowCount === 1;
  }

  async forgetEndpoint(endpoint: string) {
    await this.pool.query(
      "delete from push_subscriptions where endpoint = $1",
      [endpoint],
    );
  }
}
