import { z } from "zod";
import { isPastCalendarDate } from "../dates.js";

export const BLOOD_TYPES = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "unknown",
] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const ALLERGY_SEVERITIES = [
  "life-threatening",
  "severe",
  "moderate",
  "mild",
] as const;
export type AllergySeverity = (typeof ALLERGY_SEVERITIES)[number];

export const SEVERITY_LABELS: Record<AllergySeverity, string> = {
  "life-threatening": "Life-threatening",
  severe: "Severe",
  moderate: "Moderate",
  mild: "Mild",
};

export const MEDICAL_LIMITS = {
  allergies: 30,
  conditions: 30,
  medicines: 30,
  devices: 15,
  contacts: 5,
  short: 120,
  notes: 1000,
};

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `At most ${max} characters` })
    .default("");
const required = (what: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `Enter the ${what}` })
    .max(MEDICAL_LIMITS.short, {
      error: `At most ${MEDICAL_LIMITS.short} characters`,
    });

// A phone number as people write it: +63 917 123 4567, 0917-123-4567, (02) 8123 4567
const phone = z
  .string()
  .trim()
  .regex(/^\+?[\d\s()-]{7,20}$/, {
    error: "Enter a phone number, like 0917 123 4567",
  })
  .refine((v) => v.replace(/\D/g, "").length >= 7, {
    error: "Enter a phone number, like 0917 123 4567",
  });
const optionalPhone = z.union([z.literal(""), phone]).default("");

const list = <T extends z.ZodType>(item: T, max: number, what: string) =>
  z
    .array(item)
    .max(max, { error: `At most ${max} ${what}` })
    .default([]);

// Everything on a person's Medical ID. Every part is optional: an empty ID
// is fine, and each part can be filled in when known.
export const medicalIdSchema = z.object({
  birthDate: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || isPastCalendarDate(v), {
      error: "Enter a real date that isn't in the future",
    }),
  sex: z.enum(["", "female", "male"]).default(""),
  bloodType: z.enum(["", ...BLOOD_TYPES]).default(""),
  heightCm: z
    .number({ error: "Enter a number" })
    .min(30, { error: "Between 30 and 250 cm" })
    .max(250, { error: "Between 30 and 250 cm" })
    .nullable()
    .default(null),
  weightKg: z
    .number({ error: "Enter a number" })
    .min(1, { error: "Between 1 and 400 kg" })
    .max(400, { error: "Between 1 and 400 kg" })
    .nullable()
    .default(null),
  // Not the same as leaving allergies empty (not known)
  noKnownAllergies: z.boolean().default(false),
  allergies: list(
    z.object({
      name: required("allergy"),
      reaction: text(MEDICAL_LIMITS.short),
      severity: z.enum(ALLERGY_SEVERITIES).default("moderate"),
    }),
    MEDICAL_LIMITS.allergies,
    "allergies",
  ),
  conditions: list(
    z.object({
      name: required("condition"),
      // "2019", or empty
      since: z
        .string()
        .trim()
        .regex(/^(|19\d\d|20\d\d)$/, { error: "A year, like 2019" })
        .default(""),
    }),
    MEDICAL_LIMITS.conditions,
    "conditions",
  ),
  medicines: list(
    z.object({ name: required("medicine"), dose: text(MEDICAL_LIMITS.short) }),
    MEDICAL_LIMITS.medicines,
    "medicines",
  ),
  devices: list(
    z.object({
      name: required("implant or device"),
      note: text(MEDICAL_LIMITS.short),
    }),
    MEDICAL_LIMITS.devices,
    "implants and devices",
  ),
  // In the order to call them
  contacts: list(
    z.object({
      name: required("name"),
      relationship: text(60),
      phone,
    }),
    MEDICAL_LIMITS.contacts,
    "contacts",
  ),
  doctor: z
    .object({
      name: text(MEDICAL_LIMITS.short),
      specialty: text(80),
      clinic: text(MEDICAL_LIMITS.short),
      phone: optionalPhone,
    })
    .default({ name: "", specialty: "", clinic: "", phone: "" }),
  // 12 digits, written 12-345678901-2
  philhealth: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || v.replace(/\D/g, "").length === 12, {
      error: "A PhilHealth ID has 12 digits",
    })
    .transform((v) => {
      const d = v.replace(/\D/g, "");
      return d ? `${d.slice(0, 2)}-${d.slice(2, 11)}-${d.slice(11)}` : "";
    }),
  organDonor: z.enum(["", "yes", "no"]).default(""),
  notes: text(MEDICAL_LIMITS.notes),
});
export type MedicalIdFields = z.infer<typeof medicalIdSchema>;
export type MedicalIdInput = z.input<typeof medicalIdSchema>;

export const EMPTY_MEDICAL_ID: MedicalIdFields = medicalIdSchema.parse({});

// What the emergency QR shows besides the contacts (each one opt-in)
export const EMERGENCY_EXTRAS = [
  "bloodType",
  "allergies",
  "conditions",
  "medicines",
] as const;
export type EmergencyExtra = (typeof EMERGENCY_EXTRAS)[number];

export const EMERGENCY_EXTRA_LABELS: Record<EmergencyExtra, string> = {
  bloodType: "Blood type",
  allergies: "Allergies",
  conditions: "Conditions",
  medicines: "Medicines",
};

export const emergencySettingsSchema = z.object({
  on: z.boolean(),
  extras: z
    .array(z.enum(EMERGENCY_EXTRAS))
    .max(EMERGENCY_EXTRAS.length)
    .transform((list) => [...new Set(list)]),
});
export type EmergencySettings = z.infer<typeof emergencySettingsSchema>;
