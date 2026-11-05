import { z } from "zod";
import { isPastCalendarDate } from "./dates.js";
import type { AccessLevel, FamilyRelationship } from "./family.js";

export const RECORD_TYPES = [
  "imaging",
  "lab",
  "prescription",
  "consultation",
  "certificate",
  "vaccination",
  "billing",
  "other",
] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  imaging: "X-ray / imaging",
  lab: "Lab result",
  prescription: "Prescription",
  consultation: "Consultation",
  certificate: "Medical certificate",
  vaccination: "Vaccination",
  billing: "HMO / Billing",
  other: "Other",
};

export const TRASH_DAYS = 30;

export const RECORD_LIMITS = {
  title: 120,
  person: 120,
  notes: 5000,
  reading: 5000,
  labRows: 100,
  medicines: 50,
} as const;

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

// "owner": your own account. "manage"/"view": shared with you.
export type RecordRole = "owner" | AccessLevel;

export interface RecordPersonInfo {
  // null: the account owner themself
  profileId: string | null;
  name: string;
  relationship: FamilyRelationship | null;
}

// An account whose records you can open, and the people in it
export interface RecordAccountInfo {
  ownerId: string;
  ownerName: string;
  role: RecordRole;
  people: RecordPersonInfo[];
}

export interface RecordSummary {
  id: string;
  ownerId: string;
  profileId: string | null;
  personName: string;
  type: RecordType;
  title: string;
  recordDate: string;
  facility: string;
  doctor: string;
  // Lab results outside the normal range
  outOfRange: number;
  updatedAt: string;
}

export type RecordInfo = RecordSummary &
  RecordFields & {
    createdAt: string;
    createdByName: string | null;
    updatedByName: string | null;
    // What the person looking can do with it
    role: RecordRole;
  };

export interface TrashedRecordInfo {
  id: string;
  type: RecordType;
  title: string;
  recordDate: string;
  personName: string;
  deletedAt: string;
  deletedByName: string | null;
  // When it's deleted for good
  purgeAt: string;
}

// Lab flags

export type LabFlag = "low" | "high" | null;

// "6.0" below 12 → "low". Only plain numbers are compared ("<0.5", "Negative" aren't).
export function labFlag(
  result: Pick<LabResult, "value" | "rangeLow" | "rangeHigh">,
): LabFlag {
  const value = result.value.trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  if (result.rangeLow !== null && number < result.rangeLow) return "low";
  if (result.rangeHigh !== null && number > result.rangeHigh) return "high";
  return null;
}

// "12–16", "< 200", "> 40", or "" when no range
export function formatRange(result: Pick<LabResult, "rangeLow" | "rangeHigh">) {
  const { rangeLow: low, rangeHigh: high } = result;
  if (low !== null && high !== null) return `${low}–${high}`;
  if (high !== null) return `< ${high}`;
  if (low !== null) return `> ${low}`;
  return "";
}

// Audit trail

export const AUDIT_ACTIONS = [
  "record.created",
  "record.edited",
  "record.trashed",
  "record.restored",
  "record.deleted",
  "record.purged",
  "profile.added",
  "profile.edited",
  "profile.removed",
  "family.invited",
  "family.invitation_cancelled",
  "family.accepted",
  "family.declined",
  "family.access_changed",
  "family.removed",
  "family.left",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// One changed field: "Hemoglobin result: 6.0 → 8.0"
export interface AuditChange {
  field: string;
  from: string | null;
  to: string | null;
}

export interface AuditEntryInfo {
  id: string;
  action: AuditAction;
  // Who did it: their name at the time (null: Talaan itself, like emptying old Trash)
  actorName: string | null;
  // What it was about: a record's title, a profile's name, an email
  subject: string;
  recordId: string | null;
  changes: AuditChange[];
  at: string;
}
