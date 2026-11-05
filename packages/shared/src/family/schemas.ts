import { z } from "zod";
import { emailSchema, middleNamePart, namePart } from "../auth/index.js";
import { isPastCalendarDate } from "../dates.js";
import { ACCESS_LEVELS, FAMILY_RELATIONSHIPS } from "./constants.js";

const relationship = z.enum(FAMILY_RELATIONSHIPS, {
  error: "Choose who they are to you",
});
const access = z.enum(ACCESS_LEVELS, {
  error: "Choose what they can do",
});

export const inviteFamilySchema = z.object({
  email: emailSchema,
  relationship,
  access,
});

// The secret from the invitation email's link
export const invitationTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{20,100}$/, "That invitation link isn't complete"),
});

export const memberAccessSchema = z.object({ access });

// "YYYY-MM-DD", or empty for "don't know"
const birthDate = z
  .string()
  .trim()
  .default("")
  .refine((value) => value === "" || isPastCalendarDate(value), {
    error: "Enter a real date that isn't in the future",
  });

// Someone without their own email or phone (a young child, a lolo), kept under your account
export const familyProfileSchema = z.object({
  firstName: namePart("first name"),
  middleName: middleNamePart,
  lastName: namePart("last name"),
  relationship,
  birthDate,
});

export type InviteFamilyInput = z.input<typeof inviteFamilySchema>;
export type FamilyProfileInput = z.input<typeof familyProfileSchema>;
