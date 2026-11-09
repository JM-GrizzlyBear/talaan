import { z } from "zod";
import { REMINDER_KINDS, REMINDER_LIMITS } from "./constants.js";
import { scheduleSchema } from "./schedule.js";

const trimmed = (max: number, error: string) =>
  z.string().trim().max(max, { error });

// A reminder, as the form sends it (the same rules in the browser and the API)
export const reminderFieldsSchema = z.object({
  kind: z.enum(REMINDER_KINDS, { error: "Choose what kind of reminder" }),
  title: z
    .string()
    .trim()
    .min(1, { error: "Enter what it's for" })
    .max(REMINDER_LIMITS.title, {
      error: `At most ${REMINDER_LIMITS.title} characters`,
    }),
  // "Metformin 500 mg, 1 tablet after meals"
  dose: trimmed(
    REMINDER_LIMITS.dose,
    `At most ${REMINDER_LIMITS.dose} characters`,
  ).default(""),
  note: trimmed(
    REMINDER_LIMITS.note,
    `At most ${REMINDER_LIMITS.note} characters`,
  ).default(""),
  // null: the account owner
  profileId: z.uuid().nullable().default(null),
  // The record it's about (a lab result to repeat, say)
  recordId: z.uuid().nullable().default(null),
  schedule: scheduleSchema,
  // Minutes before each time; empty: no alerts
  alerts: z
    .array(
      z.number().int().min(0).max(REMINDER_LIMITS.alertMinutes, {
        error: "An alert can be at most 30 days before",
      }),
    )
    .max(REMINDER_LIMITS.alerts, {
      error: `At most ${REMINDER_LIMITS.alerts} alerts`,
    })
    .transform((alerts) => [...new Set(alerts)].sort((a, b) => a - b))
    .default([0]),
});
export type ReminderFields = z.infer<typeof reminderFieldsSchema>;
export type ReminderFieldsInput = z.input<typeof reminderFieldsSchema>;

export const createReminderSchema = z.object({
  ownerId: z.uuid({ error: "Choose whose reminder it is" }),
});

// Done, skipped, or snoozed: one time of a reminder
export const occurrenceActionSchema = z.discriminatedUnion("action", [
  z.object({ at: z.iso.datetime(), action: z.literal("done") }),
  z.object({ at: z.iso.datetime(), action: z.literal("skip") }),
  z.object({
    at: z.iso.datetime(),
    action: z.literal("snooze"),
    until: z.iso.datetime(),
  }),
  // Back to waiting (undoing done, skip or snooze)
  z.object({ at: z.iso.datetime(), action: z.literal("clear") }),
]);
export type OccurrenceAction = z.infer<typeof occurrenceActionSchema>;

// Each person's own alerts, for all reminders
export const alertSettingsSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
});
export type AlertSettings = z.infer<typeof alertSettingsSchema>;

// A browser that agreed to show notifications
export const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
  // "Chrome on Android", shown on the settings page
  label: z.string().trim().max(80).default(""),
});
