import type { OccurrenceState, ReminderFields } from "@talaan/shared";

export type Reminder = ReminderFields & {
  id: string;
  ownerId: string;
  paused: boolean;
  // Alerts up to here were handled
  alertsCheckedUntil: Date;
  // The next alert due; null when none are left
  nextAlertAt: Date | null;
  createdByName: string | null;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// What was done about one time of a reminder
export interface Occurrence {
  reminderId: string;
  occursAt: Date;
  state: OccurrenceState;
  snoozedUntil: Date | null;
  byName: string | null;
}

// Someone who gets a reminder's alerts: the owner and their family
export interface AlertRecipient {
  userId: string;
  email: string;
  firstName: string;
  wantsEmail: boolean;
  wantsPush: boolean;
}

export interface PushDevice {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  label: string;
  createdAt: Date;
}
