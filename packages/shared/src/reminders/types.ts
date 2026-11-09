import type { RecordRole } from "../records/types.js";
import type { ReminderKind } from "./constants.js";
import type { Schedule } from "./schedule.js";

export type OccurrenceState = "done" | "skipped" | "snoozed";

export interface ReminderSummary {
  id: string;
  ownerId: string;
  kind: ReminderKind;
  title: string;
  dose: string;
  profileId: string | null;
  // The person it's for
  personName: string;
  recordId: string | null;
  schedule: Schedule;
  alerts: number[];
  paused: boolean;
  // null: nothing left (it ended)
  nextAt: string | null;
  // You turned off your own alerts for it
  mutedByMe: boolean;
}

export interface ReminderListInfo {
  role: RecordRole;
  reminders: ReminderSummary[];
}

export interface ReminderInfo extends ReminderSummary {
  note: string;
  recordTitle: string | null;
  role: RecordRole;
  ownerName: string;
  createdByName: string | null;
  updatedByName: string | null;
  updatedAt: string;
  // The next times, with what was done about each
  upcoming: AgendaItem[];
  // Recent times that were done, skipped or missed
  recent: AgendaItem[];
}

// One time of a reminder
export interface AgendaItem {
  reminderId: string;
  at: string;
  state: OccurrenceState | null;
  snoozedUntil: string | null;
  // Who marked it done or skipped
  byName: string | null;
}

export interface AgendaInfo {
  role: RecordRole;
  items: (AgendaItem & {
    title: string;
    kind: ReminderKind;
    dose: string;
    personName: string;
  })[];
}

export interface PushDeviceInfo {
  id: string;
  label: string;
  // The end of the browser's push address, to know which one is "this one"
  endpointTail: string;
  createdAt: string;
}

export interface AlertSettingsInfo {
  email: boolean;
  push: boolean;
  // null: browser notifications aren't set up on this Talaan
  pushKey: string | null;
  devices: PushDeviceInfo[];
}
