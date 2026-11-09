import { z } from "zod";
import { SHARE_LIMITS } from "./constants.js";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `At most ${max} characters` });

// "" for none, or 6 digits
export const sharePinSchema = z
  .string()
  .trim()
  .refine((pin) => pin === "" || /^\d{6}$/.test(pin), {
    error: "Use 6 digits",
  });

const expiresAt = z.iso.datetime({
  offset: true,
  error: "Choose when it ends",
});

const maxViews = z
  .number({ error: "Enter a number" })
  .int({ error: "Enter a whole number" })
  .min(1, { error: "At least 1" })
  .max(SHARE_LIMITS.maxViews, { error: `At most ${SHARE_LIMITS.maxViews}` })
  .nullable()
  .default(null);

// A new link: whose records, what is in it, how long it lasts, and its PIN
export const newShareSchema = z
  .object({
    ownerId: z.uuid().optional(),
    // "self": the account owner
    profileId: z.union([z.literal("self"), z.uuid()]).default("self"),
    recipient: text(SHARE_LIMITS.recipient).min(1, {
      error: "Who is it for? Like “Dr. Reyes”",
    }),
    note: text(SHARE_LIMITS.note).default(""),
    medicalId: z.boolean().default(false),
    labs: z.boolean().default(false),
    recordIds: z
      .array(z.uuid())
      .max(SHARE_LIMITS.records, {
        error: `At most ${SHARE_LIMITS.records} records`,
      })
      .default([]),
    expiresAt,
    maxViews,
    pin: sharePinSchema.default(""),
  })
  .refine((s) => s.medicalId || s.labs || s.recordIds.length > 0, {
    error: "Choose at least one thing to share",
    path: ["what"],
  });
export type NewShare = z.infer<typeof newShareSchema>;

// Changing a link after it's made. pin: undefined keeps it, "" removes it.
export const shareSettingsSchema = z.object({
  expiresAt,
  maxViews,
  pin: sharePinSchema.optional(),
});
export type ShareSettings = z.infer<typeof shareSettingsSchema>;

// What the doctor types
export const openShareSchema = z.object({
  pin: z.string().trim().max(20).default(""),
});
