import {
  nextOccurrences,
  occurrencesBetween,
  type OccurrenceAction,
  type ReminderFields,
} from "@talaan/shared";
import { NotFoundError } from "../../domain/errors.js";
import { ReminderError } from "../../domain/reminder/errors.js";
import { nextAlertAt, nextPending } from "../../domain/reminder/alertPlan.js";
import type { Occurrence, Reminder } from "../../domain/reminder/Reminder.js";
import type { ReminderRepository } from "../../domain/reminder/ReminderRepository.js";
import type { RecordRepository } from "../../domain/record/RecordRepository.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { Clock } from "../ports/Clock.js";
import { personName, type RecordAccess } from "../record/RecordAccess.js";

const NOT_FOUND =
  "That reminder isn't there anymore, or it isn't shared with you.";
const DAY = 24 * 60 * 60 * 1000;
// At most this many times per reminder in a list of what's coming
const PER_REMINDER = 100;
const AGENDA_MAX = 400;

const key = (d: Date) => d.toISOString();

// Reminders follow the account's sharing: owners and "Can manage" family add,
// change, pause and mark times done; only the owner removes one; everyone
// it's shared with sees it and gets its alerts (unless they turn them off).
export class Reminders {
  constructor(
    private readonly reminders: ReminderRepository,
    private readonly records: RecordRepository,
    private readonly access: RecordAccess,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
  ) {}

  // Anyone it isn't shared with gets "not found"
  private async role(viewerId: string, ownerId: string) {
    try {
      return await this.access.roleFor(viewerId, ownerId);
    } catch (error) {
      if (error instanceof NotFoundError) throw new NotFoundError(NOT_FOUND);
      throw error;
    }
  }

  private async visible(viewerId: string, id: string) {
    const reminder = await this.reminders.findById(id);
    if (!reminder) throw new NotFoundError(NOT_FOUND);
    const role = await this.role(viewerId, reminder.ownerId);
    return { reminder, role };
  }

  private async forChange(viewerId: string, id: string) {
    const found = await this.visible(viewerId, id);
    await this.access.requireManage(viewerId, found.reminder.ownerId);
    return found.reminder;
  }

  // The person and the record have to be in the same account
  private async check(ownerId: string, fields: ReminderFields) {
    const household = await this.access.household(ownerId);
    this.access.requireOwnProfile(household, fields.profileId);
    if (fields.recordId) {
      const record = await this.records.findById(fields.recordId);
      if (!record || record.ownerId !== ownerId || record.deletedAt) {
        throw new NotFoundError("That record isn't there anymore.");
      }
    }
    return household;
  }

  // Alerts are planned from now on: nothing from before is sent
  private async plan(
    reminder: Pick<Reminder, "schedule" | "alerts" | "paused"> & {
      id?: string;
    },
  ) {
    const now = this.clock.now();
    const states = reminder.id
      ? await this.reminders.occurrences([reminder.id], now)
      : [];
    return {
      checkedUntil: now,
      nextAlertAt: nextAlertAt(reminder, states, now),
    };
  }

  async list(viewerId: string, ownerId: string) {
    const role = await this.role(viewerId, ownerId);
    const reminders = await this.reminders.listForOwner(ownerId);
    const household = await this.access.household(ownerId);
    const now = this.clock.now();
    const ids = reminders.map((r) => r.id);
    const states = await this.reminders.occurrences(ids, now);
    const muted = await this.reminders.mutedBy(viewerId, ids);
    return {
      role,
      reminders: reminders.map((reminder) => ({
        reminder,
        personName: personName(household, reminder.profileId),
        nextAt: nextPending(
          reminder.schedule,
          states.filter((s) => s.reminderId === reminder.id),
          now,
        ),
        mutedByMe: muted.has(reminder.id),
      })),
    };
  }

  async get(viewerId: string, id: string) {
    const { reminder, role } = await this.visible(viewerId, id);
    const household = await this.access.household(reminder.ownerId);
    const now = this.clock.now();
    const weekAgo = new Date(now.getTime() - 7 * DAY);
    const states = await this.reminders.occurrences([id], weekAgo);
    const stateAt = new Map(states.map((s) => [key(s.occursAt), s]));
    const item = (at: Date) => ({ at, state: stateAt.get(key(at)) ?? null });
    const record = reminder.recordId
      ? await this.records.findById(reminder.recordId)
      : null;
    return {
      reminder,
      role,
      ownerName: household.ownerName,
      personName: personName(household, reminder.profileId),
      recordTitle: record && !record.deletedAt ? record.title : null,
      nextAt: nextPending(reminder.schedule, states, now),
      mutedByMe: (await this.reminders.mutedBy(viewerId, [id])).has(id),
      upcoming: nextOccurrences(reminder.schedule, now, 5).map(item),
      // Times from before it was made aren't "missed"
      recent: occurrencesBetween(
        reminder.schedule,
        new Date(Math.max(weekAgo.getTime(), reminder.createdAt.getTime())),
        now,
      )
        .reverse()
        .slice(0, 10)
        .map(item),
    };
  }

  // Every time in [from, to) across an account's reminders, with what was done
  async agenda(viewerId: string, ownerId: string, from: Date, to: Date) {
    const role = await this.role(viewerId, ownerId);
    const reminders = (await this.reminders.listForOwner(ownerId)).filter(
      (r) => !r.paused,
    );
    const household = await this.access.household(ownerId);
    const states = await this.reminders.occurrences(
      reminders.map((r) => r.id),
      from,
    );
    const stateAt = new Map(
      states.map((s) => [`${s.reminderId}|${key(s.occursAt)}`, s]),
    );
    const items = reminders.flatMap((reminder) =>
      occurrencesBetween(
        reminder.schedule,
        // Times from before it was made aren't "missed"
        new Date(Math.max(from.getTime(), reminder.createdAt.getTime())),
        to,
      )
        .slice(0, PER_REMINDER)
        .map((at) => ({
          reminder,
          personName: personName(household, reminder.profileId),
          at,
          state: stateAt.get(`${reminder.id}|${key(at)}`) ?? null,
        })),
    );
    items.sort((a, b) => a.at.getTime() - b.at.getTime());
    return { role, items: items.slice(0, AGENDA_MAX) };
  }

  async create(actorId: string, ownerId: string, fields: ReminderFields) {
    await this.access.requireManage(actorId, ownerId);
    const household = await this.check(ownerId, fields);
    const reminder = await this.reminders.create(
      ownerId,
      fields,
      actorId,
      this.clock.now(),
      await this.plan({ ...fields, paused: false }),
    );
    await this.audit.log({
      ownerId,
      action: "reminder.created",
      actorId,
      subject: reminder.title,
      changes: [
        {
          field: "For",
          from: null,
          to: personName(household, fields.profileId),
        },
      ],
    });
    return reminder;
  }

  async update(actorId: string, id: string, fields: ReminderFields) {
    const before = await this.forChange(actorId, id);
    await this.check(before.ownerId, fields);
    const reminder = await this.reminders.update(
      id,
      fields,
      actorId,
      this.clock.now(),
      await this.plan({ ...fields, paused: before.paused, id }),
    );
    const changes = [];
    if (before.title !== fields.title) {
      changes.push({ field: "Title", from: before.title, to: fields.title });
    }
    if (JSON.stringify(before.schedule) !== JSON.stringify(fields.schedule)) {
      changes.push({ field: "When", from: "Before", to: "Changed" });
    }
    if (JSON.stringify(before.alerts) !== JSON.stringify(fields.alerts)) {
      changes.push({ field: "Alerts", from: "Before", to: "Changed" });
    }
    await this.audit.log({
      ownerId: before.ownerId,
      action: "reminder.edited",
      actorId,
      subject: reminder.title,
      changes,
    });
    return reminder;
  }

  async setPaused(actorId: string, id: string, paused: boolean) {
    const reminder = await this.forChange(actorId, id);
    if (reminder.paused === paused) return;
    await this.reminders.setPaused(
      id,
      paused,
      actorId,
      this.clock.now(),
      await this.plan({ ...reminder, paused, id }),
    );
    await this.audit.log({
      ownerId: reminder.ownerId,
      action: paused ? "reminder.paused" : "reminder.resumed",
      actorId,
      subject: reminder.title,
    });
  }

  async remove(actorId: string, id: string) {
    const { reminder } = await this.visible(actorId, id);
    await this.access.requireOwner(actorId, reminder.ownerId);
    await this.reminders.remove(id);
    await this.audit.log({
      ownerId: reminder.ownerId,
      action: "reminder.removed",
      actorId,
      subject: reminder.title,
    });
  }

  // Done, skip, snooze or undo one time
  async act(actorId: string, id: string, action: OccurrenceAction) {
    const reminder = await this.forChange(actorId, id);
    const occursAt = new Date(action.at);
    const isTime =
      occurrencesBetween(
        reminder.schedule,
        occursAt,
        new Date(occursAt.getTime() + 1),
      ).length === 1;
    if (!isTime) {
      throw new ReminderError("That isn't one of this reminder's times", "at");
    }
    let change: {
      state: Occurrence["state"];
      snoozedUntil: Date | null;
    } | null;
    if (action.action === "clear") change = null;
    else if (action.action === "snooze") {
      const until = new Date(action.until);
      if (until <= this.clock.now()) {
        throw new ReminderError("Snooze until a time from now", "until");
      }
      change = { state: "snoozed", snoozedUntil: until };
    } else {
      change = {
        state: action.action === "done" ? "done" : "skipped",
        snoozedUntil: null,
      };
    }
    await this.reminders.setOccurrence(
      id,
      occursAt,
      change,
      actorId,
      this.clock.now(),
    );
    await this.reminders.setPlan(id, await this.plan(reminder));
  }

  // Each person's own: alerts for this reminder on or off
  async setMuted(viewerId: string, id: string, muted: boolean) {
    await this.visible(viewerId, id);
    await this.reminders.setMuted(id, viewerId, muted);
  }
}
