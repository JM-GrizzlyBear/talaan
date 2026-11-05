import { z } from "zod";
import { emailSchema, middleNamePart, namePart } from "./auth.js";

// Who someone is to the account owner. Filipino family words, as people say them.
export const FAMILY_RELATIONSHIPS = [
  "Asawa",
  "Anak",
  "Nanay",
  "Tatay",
  "Kapatid",
  "Lolo",
  "Lola",
  "Apo",
  "Tito",
  "Tita",
  "Pamangkin",
  "Pinsan",
  "Caregiver",
  "Other",
] as const;
export type FamilyRelationship = (typeof FAMILY_RELATIONSHIPS)[number];

// What a family member may do with the owner's records (one way: inviting
// Nanay doesn't let you see hers)
export const ACCESS_LEVELS = ["view", "manage"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export const ACCESS_LABELS: Record<
  AccessLevel,
  { name: string; detail: string }
> = {
  view: {
    name: "Can view",
    detail: "Sees your records and lab comparisons. Can't change anything.",
  },
  manage: {
    name: "Can manage",
    detail:
      "Can also add records, scan papers and set reminders for you. For someone looking after you.",
  },
};

// The same levels, told to the person invited (the email and the link's page)
export const ACCESS_FOR_INVITEE: Record<AccessLevel, string> = {
  view: "You'll see their records and lab comparisons, but can't change anything.",
  manage:
    "You'll see their records, and can add records, scan papers and set reminders for them.",
};

export const INVITATION_DAYS = 7;

export const FAMILY_LIMITS = {
  // People who can see your records, plus invitations still waiting
  members: 20,
  // Family without their own email or phone, kept under your account
  profiles: 20,
} as const;

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
  .refine(
    (value) => {
      if (value === "") return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().startsWith(value) &&
        value >= "1900-01-01" &&
        date.getTime() <= Date.now()
      );
    },
    { error: "Enter a real date that isn't in the future" },
  );

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

export interface PersonName {
  firstName: string;
  middleName: string | null;
  lastName: string;
}

export interface FamilyProfileInfo extends PersonName {
  id: string;
  relationship: FamilyRelationship;
  birthDate: string | null;
  createdAt: string;
}

// Someone who can see my records
export interface FamilyMemberInfo extends PersonName {
  userId: string;
  email: string;
  relationship: FamilyRelationship;
  access: AccessLevel;
  since: string;
}

export type SentInvitationStatus = "pending" | "expired" | "declined";

export interface SentInvitationInfo {
  id: string;
  email: string;
  relationship: FamilyRelationship;
  access: AccessLevel;
  status: SentInvitationStatus;
  sentAt: string;
  expiresAt: string;
}

// Someone whose records I can see, with the profiles they keep
export interface SharedWithMeInfo extends PersonName {
  ownerId: string;
  email: string;
  // Who I am to them
  relationship: FamilyRelationship;
  access: AccessLevel;
  since: string;
  profiles: FamilyProfileInfo[];
}

// GET /api/family
export interface FamilyOverview {
  members: FamilyMemberInfo[];
  invitations: SentInvitationInfo[];
  profiles: FamilyProfileInfo[];
  sharedWithMe: SharedWithMeInfo[];
}

export type InvitationStatus =
  "pending" | "expired" | "accepted" | "declined" | "cancelled";

// What the invitation link shows, before signing in
export interface InvitationPreview {
  inviterName: string;
  // Partly hidden, like m•••a@example.com
  email: string;
  relationship: FamilyRelationship;
  access: AccessLevel;
  status: InvitationStatus;
  expiresAt: string;
  // Signed in: whether this account's email is the invited one. null: not signed in.
  forThisAccount: boolean | null;
}

// "Asawa" → shown as is; "Other" → "Family"
export function relationshipLabel(relationship: FamilyRelationship) {
  return relationship === "Other" ? "Family" : relationship;
}
