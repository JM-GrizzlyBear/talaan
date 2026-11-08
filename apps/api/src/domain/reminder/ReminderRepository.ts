import type { AlertSettings, ReminderFields } from "@talaan/shared";
import type {
  AlertRecipient,
  Occurrence,
  PushDevice,
  Reminder,
} from "./Reminder.js";

export interface AlertPlan {
  // Alerts before this were handled
  checkedUntil: Date;
  nextAlertAt: Date | null;
}

export interface ReminderRepository {
  listForOwner(ownerId: string): Promise<Reminder[]>;
  findById(id: string): Promise<Reminder | null>;
  create(
    ownerId: string,
    fields: ReminderFields,
    actorId: string,
    at: Date,
    plan: AlertPlan,
  ): Promise<Reminder>;
  update(
    id: string,
    fields: ReminderFields,
    actorId: string,
    at: Date,
    plan: AlertPlan,
  ): Promise<Reminder>;
  setPaused(
    id: string,
    paused: boolean,
    actorId: string,
    at: Date,
    plan: AlertPlan,
  ): Promise<void>;
  setPlan(id: string, plan: AlertPlan): Promise<void>;
  remove(id: string): Promise<void>;

  // What was done about times of these reminders: times from `from` on, and
  // snoozes that end after it
  occurrences(reminderIds: string[], from: Date): Promise<Occurrence[]>;
  setOccurrence(
    reminderId: string,
    occursAt: Date,
    change: { state: Occurrence["state"]; snoozedUntil: Date | null } | null,
    actorId: string,
    at: Date,
  ): Promise<void>;

  // Reminders with an alert due by now (not paused)
  dueForAlerts(now: Date, limit: number): Promise<Reminder[]>;
  // The owner and everyone the account is shared with, minus those who
  // turned this reminder's alerts off
  recipients(reminderId: string, ownerId: string): Promise<AlertRecipient[]>;
  // true the first time only: the alert is sent once per person and way
  claimDelivery(delivery: {
    reminderId: string;
    occursAt: Date;
    alertAt: Date;
    userId: string;
    channel: "email" | "push";
  }): Promise<boolean>;
  forgetDeliveriesBefore(at: Date): Promise<void>;

  setMuted(reminderId: string, userId: string, muted: boolean): Promise<void>;
  mutedBy(userId: string, reminderIds: string[]): Promise<Set<string>>;
}

// Each person's alerts, and the browsers they turned notifications on in
export interface AlertSettingsRepository {
  get(userId: string): Promise<AlertSettings>;
  set(userId: string, settings: AlertSettings): Promise<void>;
  devices(userId: string): Promise<PushDevice[]>;
  addDevice(
    userId: string,
    device: { endpoint: string; p256dh: string; auth: string; label: string },
  ): Promise<PushDevice>;
  removeDevice(userId: string, id: string): Promise<boolean>;
  // The push service said this browser is gone
  forgetEndpoint(endpoint: string): Promise<void>;
}
