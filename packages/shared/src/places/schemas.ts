import { z } from "zod";
import { PLACE_KINDS, PLACE_LIMITS } from "./constants.js";

export const placeFieldsSchema = z.object({
  kind: z.enum(PLACE_KINDS, { error: "Choose what kind of place it is" }),
  name: z
    .string()
    .trim()
    .min(1, "Give it a name, like “Lola's X-rays” or “Blue box”")
    .max(PLACE_LIMITS.name, `At most ${PLACE_LIMITS.name} characters`),
  note: z
    .string()
    .trim()
    .max(PLACE_LIMITS.note, `At most ${PLACE_LIMITS.note} characters`)
    .default(""),
  // The place it's inside; null: not inside another place
  parentId: z.uuid().nullable().default(null),
});

// Adding: which account it goes into
export const createPlaceSchema = z.object({ ownerId: z.uuid() });

export const blankLabelsSchema = z.object({
  ownerId: z.uuid(),
  count: z
    .number({ error: "Enter how many" })
    .int("Enter a whole number")
    .min(1, "At least 1")
    .max(
      PLACE_LIMITS.blankAtOnce,
      `At most ${PLACE_LIMITS.blankAtOnce} at a time`,
    ),
});

// A place's photo, after the browser uploaded it (checked by the API)
export const placePhotoSchema = z.object({
  upload: z.record(z.string(), z.unknown()),
});

export type PlaceFields = z.output<typeof placeFieldsSchema>;
export type PlaceFieldsInput = z.input<typeof placeFieldsSchema>;
