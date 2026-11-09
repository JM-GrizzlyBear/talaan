import { fullName, type ReminderFields } from "@talaan/shared";
import type { Pool } from "pg";
import type {
  AlertRecipient,
  Occurrence,
  Reminder,
} from "../../domain/reminder/Reminder.js";
import type {
  AlertPlan,
  ReminderRepository,
} from "../../domain/reminder/ReminderRepository.js";

interface ReminderRow {
  id: string;
  owner_id: string;
  profile_id: string | null;
  record_id: string | null;
  kind: Reminder["kind"];
  title: string;
  dose: string;
  note: string;
  schedule: Reminder["schedule"];
  alerts: number[];
  paused: boolean;
  alerts_checked_until: Date;
  next_alert_at: Date | null;
  created_first: string | null;
  created_middle: string | null;
  created_last: string | null;
  updated_first: string | null;
  updated_middle: string | null;
  updated_last: string | null;
  created_at: Date;
  updated_at: Date;
}

const SELECT = `
  select r.*,
         cu.first_name as created_first, cu.middle_name as created_middle,
         cu.last_name as created_last,
         uu.first_name as updated_first, uu.middle_name as updated_middle,
         uu.last_name as updated_last
    from reminders r
    left join users cu on cu.id = r.created_by
    left join users uu on uu.id = r.updated_by`;

const nameOf = (
  first: string | null,
  middle: string | null,
  last: string | null,
) =>
  first
    ? fullName({ firstName: first, middleName: middle, lastName: last ?? "" })
    : null;

function toReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    ownerId: row.owner_id,
    profileId: row.profile_id,
    recordId: row.record_id,
    kind: row.kind,
    title: row.title,
    dose: row.dose,
    note: row.note,
    schedule: row.schedule,
    alerts: row.alerts,
    paused: row.paused,
    alertsCheckedUntil: row.alerts_checked_until,
    nextAlertAt: row.next_alert_at,
    createdByName: nameOf(
      row.created_first,
      row.created_middle,
      row.created_last,
    ),
    updatedByName: nameOf(
      row.updated_first,
      row.updated_middle,
      row.updated_last,
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const fieldValues = (f: ReminderFields) => [
  f.profileId,
  f.recordId,
  f.kind,
  f.title,
  f.dose,
  f.note,
  JSON.stringify(f.schedule),
  JSON.stringify(f.alerts),
];

export class PostgresReminderRepository implements ReminderRepository {
  constructor(private readonly pool: Pool) {}

  async listForOwner(ownerId: string) {
    const result = await this.pool.query<ReminderRow>(
      `${SELECT} where r.owner_id = $1 order by r.created_at`,
      [ownerId],
    );
    return result.rows.map(toReminder);
  }

  async findById(id: string) {
    const result = await this.pool.query<ReminderRow>(
      `${SELECT} where r.id = $1`,
      [id],
    );
    return result.rows[0] ? toReminder(result.rows[0]) : null;
  }

  private async mustFind(id: string) {
    const reminder = await this.findById(id);
    if (!reminder) throw new Error(`Reminder ${id} vanished`);
    return reminder;
  }

  async create(
    ownerId: string,
    fields: ReminderFields,
    actorId: string,
    at: Date,
    plan: AlertPlan,
  ) {
    const result = await this.pool.query<{ id: string }>(
      `insert into reminders
         (profile_id, record_id, kind, title, dose, note, schedule, alerts,
          owner_id, alerts_checked_until, next_alert_at,
          created_by, created_at, updated_by, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $12, $13)
       returning id`,
      [
        ...fieldValues(fields),
        ownerId,
        plan.checkedUntil,
        plan.nextAlertAt,
        actorId,
        at,
      ],
    );
    return await this.mustFind(result.rows[0].id);
  }

  async update(
    id: string,
    fields: ReminderFields,
    actorId: string,
    at: Date,
    plan: AlertPlan,
  ) {
    await this.pool.query(
      `update reminders
          set profile_id = $1, record_id = $2, kind = $3, title = $4, dose = $5,
              note = $6, schedule = $7, alerts = $8,
              alerts_checked_until = $9, next_alert_at = $10,
              updated_by = $11, updated_at = $12
        where id = $13`,
      [
        ...fieldValues(fields),
        plan.checkedUntil,
        plan.nextAlertAt,
        actorId,
        at,
        id,
      ],
    );
    return await this.mustFind(id);
  }

  async setPaused(
    id: string,
    paused: boolean,
    actorId: string,
    at: Date,
    plan: AlertPlan,
  ) {
    await this.pool.query(
      `update reminders
          set paused = $2, alerts_checked_until = $3, next_alert_at = $4,
              updated_by = $5, updated_at = $6
        where id = $1`,
      [id, paused, plan.checkedUntil, plan.nextAlertAt, actorId, at],
    );
  }

  async setPlan(id: string, plan: AlertPlan) {
    await this.pool.query(
      `update reminders set alerts_checked_until = $2, next_alert_at = $3
        where id = $1`,
      [id, plan.checkedUntil, plan.nextAlertAt],
    );
  }

  async remove(id: string) {
    await this.pool.query("delete from reminders where id = $1", [id]);
  }

  async occurrences(reminderIds: string[], from: Date) {
    if (reminderIds.length === 0) return [];
    const result = await this.pool.query<{
      reminder_id: string;
      occurs_at: Date;
      state: Occurrence["state"];
      snoozed_until: Date | null;
      first_name: string | null;
      middle_name: string | null;
      last_name: string | null;
    }>(
      `select o.reminder_id, o.occurs_at, o.state, o.snoozed_until,
              u.first_name, u.middle_name, u.last_name
         from reminder_occurrences o
         left join users u on u.id = o.by_user
        where o.reminder_id = any($1)
          and (o.occurs_at >= $2 or o.snoozed_until > $2)
        order by o.occurs_at`,
      [reminderIds, from],
    );
    return result.rows.map((row) => ({
      reminderId: row.reminder_id,
      occursAt: row.occurs_at,
      state: row.state,
      snoozedUntil: row.snoozed_until,
      byName: nameOf(row.first_name, row.middle_name, row.last_name),
    }));
  }

  async setOccurrence(
    reminderId: string,
    occursAt: Date,
    change: { state: Occurrence["state"]; snoozedUntil: Date | null } | null,
    actorId: string,
    at: Date,
  ) {
    if (!change) {
      await this.pool.query(
        "delete from reminder_occurrences where reminder_id = $1 and occurs_at = $2",
        [reminderId, occursAt],
      );
      return;
    }
    await this.pool.query(
      `insert into reminder_occurrences
         (reminder_id, occurs_at, state, snoozed_until, by_user, updated_at)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (reminder_id, occurs_at) do update
         set state = excluded.state, snoozed_until = excluded.snoozed_until,
             by_user = excluded.by_user, updated_at = excluded.updated_at`,
      [reminderId, occursAt, change.state, change.snoozedUntil, actorId, at],
    );
  }

  async dueForAlerts(now: Date, limit: number) {
    const result = await this.pool.query<ReminderRow>(
      `${SELECT}
        where not r.paused and r.next_alert_at is not null
          and r.next_alert_at <= $1
        order by r.next_alert_at
        limit $2`,
      [now, limit],
    );
    return result.rows.map(toReminder);
  }

  async recipients(reminderId: string, ownerId: string) {
    const result = await this.pool.query<{
      id: string;
      email: string;
      first_name: string;
      alert_email: boolean;
      alert_push: boolean;
    }>(
      `select u.id, u.email, u.first_name, u.alert_email, u.alert_push
         from users u
        where (u.id = $2
               or u.id in (select member_id from family_access where owner_id = $2))
          and not exists (
            select 1 from reminder_mutes m
             where m.reminder_id = $1 and m.user_id = u.id)`,
      [reminderId, ownerId],
    );
    return result.rows.map((row): AlertRecipient => ({
      userId: row.id,
      email: row.email,
      firstName: row.first_name,
      wantsEmail: row.alert_email,
      wantsPush: row.alert_push,
    }));
  }

  async claimDelivery(d: {
    reminderId: string;
    occursAt: Date;
    alertAt: Date;
    userId: string;
    channel: "email" | "push";
  }) {
    const result = await this.pool.query(
      `insert into reminder_deliveries
         (reminder_id, occurs_at, alert_at, user_id, channel)
       values ($1, $2, $3, $4, $5)
       on conflict do nothing`,
      [d.reminderId, d.occursAt, d.alertAt, d.userId, d.channel],
    );
    return result.rowCount === 1;
  }

  async forgetDeliveriesBefore(at: Date) {
    await this.pool.query(
      "delete from reminder_deliveries where sent_at < $1",
      [at],
    );
  }

  async setMuted(reminderId: string, userId: string, muted: boolean) {
    await this.pool.query(
      muted
        ? `insert into reminder_mutes (reminder_id, user_id) values ($1, $2)
           on conflict do nothing`
        : "delete from reminder_mutes where reminder_id = $1 and user_id = $2",
      [reminderId, userId],
    );
  }

  async mutedBy(userId: string, reminderIds: string[]) {
    if (reminderIds.length === 0) return new Set<string>();
    const result = await this.pool.query<{ reminder_id: string }>(
      `select reminder_id from reminder_mutes
        where user_id = $1 and reminder_id = any($2)`,
      [userId, reminderIds],
    );
    return new Set(result.rows.map((r) => r.reminder_id));
  }
}
