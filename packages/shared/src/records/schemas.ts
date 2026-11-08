import { z } from "zod";
import { isPastCalendarDate } from "../dates.js";
import { RECORD_LIMITS, type RecordType } from "./constants.js";

const text = (max: number) =>
  z.string().trim().max(max, `At most ${max} characters`).default("");
const required = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, `At most ${max} characters`);
// A number typed in a form, or null when left empty
const optionalNumber = z
  .number({ error: "Enter a number" })
  .finite()
  .nullable()
  .default(null);
const pesos = z
  .number({ error: "Enter an amount" })
  .finite()
  .min(0, "Can't be negative")
  .max(100_000_000, "That amount is too big")
  .transform((value) => Math.round(value * 100) / 100)
  .nullable()
  .default(null);

export const labResultSchema = z
  .object({
    name: required(80, "Enter the test name"),
    // Text, because results can be "6.0", "<0.5" or "Negative"
    value: required(30, "Enter the result"),
    unit: text(20),
    rangeLow: optionalNumber,
    rangeHigh: optionalNumber,
  })
  .refine(
    (row) =>
      row.rangeLow === null ||
      row.rangeHigh === null ||
      row.rangeLow <= row.rangeHigh,
    { error: "The low end must be below the high end", path: ["rangeHigh"] },
  );

export const medicineSchema = z.object({
  name: required(120, "Enter the medicine"),
  dose: text(60),
  frequency: text(120),
});

// The fields that only some types have
export const recordDetailsSchemas = {
  imaging: z.object({
    // What was imaged, like "Chest PA"
    bodyPart: text(120),
    // The radiologist's reading (impression)
    reading: text(RECORD_LIMITS.reading),
  }),
  lab: z.object({
    results: z
      .array(labResultSchema)
      .max(RECORD_LIMITS.labRows, `At most ${RECORD_LIMITS.labRows} tests`)
      .default([]),
  }),
  prescription: z.object({
    medicines: z
      .array(medicineSchema)
      .max(
        RECORD_LIMITS.medicines,
        `At most ${RECORD_LIMITS.medicines} medicines`,
      )
      .default([]),
  }),
  consultation: z.object({}),
  certificate: z.object({}),
  vaccination: z.object({
    vaccine: text(120),
    // "1st dose", "Booster"
    dose: text(40),
  }),
  billing: z.object({
    hmo: text(120),
    loaNumber: text(60),
    totalAmount: pesos,
    hmoCovered: pesos,
    youPaid: pesos,
  }),
  other: z.object({}),
} as const;

export type LabResult = z.output<typeof labResultSchema>;
export type Medicine = z.output<typeof medicineSchema>;
export type RecordDetails = {
  [T in RecordType]: z.output<(typeof recordDetailsSchemas)[T]>;
};
export type AnyRecordDetails = RecordDetails[RecordType];

const recordDate = z
  .string()
  .trim()
  .refine((value) => isPastCalendarDate(value), {
    error: "Enter a real date that isn't in the future",
  });

const baseFields = {
  // null: the account owner themself; otherwise one of their family profiles
  profileId: z.uuid().nullable().default(null),
  title: required(RECORD_LIMITS.title, "Give the record a title"),
  recordDate,
  doctor: text(RECORD_LIMITS.person),
  facility: text(RECORD_LIMITS.person),
  notes: text(RECORD_LIMITS.notes),
  // Where the paper or film is kept (a place in the same account)
  placeId: z.uuid().nullable().default(null),
};

function variant<T extends RecordType, D extends z.ZodType>(
  type: T,
  details: D,
) {
  return z.object({
    ...baseFields,
    type: z.literal(type),
    // Leaving details out means "all empty"
    details: details.prefault({} as z.input<D>),
  });
}

const d = recordDetailsSchemas;

// The form: the common fields plus the details for the chosen type
export const recordFieldsSchema = z.discriminatedUnion(
  "type",
  [
    variant("imaging", d.imaging),
    variant("lab", d.lab),
    variant("prescription", d.prescription),
    variant("consultation", d.consultation),
    variant("certificate", d.certificate),
    variant("vaccination", d.vaccination),
    variant("billing", d.billing),
    variant("other", d.other),
  ],
  { error: "Choose a record type" },
);

// Adding: which account it goes into (yours, or one shared with you as "Can manage")
export const createRecordSchema = z.object({ ownerId: z.uuid() });

export type RecordFields = z.output<typeof recordFieldsSchema>;
export type RecordFieldsInput = z.input<typeof recordFieldsSchema>;
