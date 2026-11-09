import type {
  AgendaInfo,
  AgendaItem,
  AlertSettingsInfo,
  RecordRole,
  ReminderInfo,
  ReminderSummary,
} from "@talaan/shared";
import type {
  Occurrence,
  PushDevice,
  Reminder,
} from "../../../domain/reminder/Reminder.js";

// Domain objects → what the browser receives

export function reminderSummaryJson(shown: {
  reminder: Reminder;
  personName: string;
  nextAt: Date | null;
  mutedByMe: boolean;
}): ReminderSummary {
  const r = shown.reminder;
  return {
    id: r.id,
    ownerId: r.ownerId,
    kind: r.kind,
    title: r.title,
    dose: r.dose,
    profileId: r.profileId,
    personName: shown.personName,
    recordId: r.recordId,
    schedule: r.schedule,
    alerts: r.alerts,
    paused: r.paused,
    nextAt: shown.nextAt?.toISOString() ?? null,
    mutedByMe: shown.mutedByMe,
  };
}

function itemJson(
  reminderId: string,
  item: { at: Date; state: Occurrence | null },
): AgendaItem {
  return {
    reminderId,
    at: item.at.toISOString(),
    state: item.state?.state ?? null,
    snoozedUntil: item.state?.snoozedUntil?.toISOString() ?? null,
    byName: item.state?.byName ?? null,
  };
}

export function reminderJson(shown: {
  reminder: Reminder;
  role: RecordRole;
  ownerName: string;
  personName: string;
  recordTitle: string | null;
  nextAt: Date | null;
  mutedByMe: boolean;
  upcoming: { at: Date; state: Occurrence | null }[];
  recent: { at: Date; state: Occurrence | null }[];
}): ReminderInfo {
  const r = shown.reminder;
  return {
    ...reminderSummaryJson(shown),
    note: r.note,
    recordTitle: shown.recordTitle,
    role: shown.role,
    ownerName: shown.ownerName,
    createdByName: r.createdByName,
    updatedByName: r.updatedByName,
    updatedAt: r.updatedAt.toISOString(),
    upcoming: shown.upcoming.map((i) => itemJson(r.id, i)),
    recent: shown.recent.map((i) => itemJson(r.id, i)),
  };
}

export function agendaJson(agenda: {
  role: RecordRole;
  items: {
    reminder: Reminder;
    personName: string;
    at: Date;
    state: Occurrence | null;
  }[];
}): AgendaInfo {
  return {
    role: agenda.role,
    items: agenda.items.map((item) => ({
      ...itemJson(item.reminder.id, item),
      title: item.reminder.title,
      kind: item.reminder.kind,
      dose: item.reminder.dose,
      personName: item.personName,
    })),
  };
}

export function alertSettingsJson(settings: {
  email: boolean;
  push: boolean;
  pushKey: string | null;
  devices: PushDevice[];
}): AlertSettingsInfo {
  return {
    email: settings.email,
    push: settings.push,
    pushKey: settings.pushKey,
    devices: settings.devices.map((d) => ({
      id: d.id,
      label: d.label,
      endpointTail: d.endpoint.slice(-24),
      createdAt: d.createdAt.toISOString(),
    })),
  };
}
