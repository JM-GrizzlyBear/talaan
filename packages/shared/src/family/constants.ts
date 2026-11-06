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

// "Asawa" → shown as is; "Other" → "Family"
export function relationshipLabel(relationship: FamilyRelationship) {
  return relationship === "Other" ? "Family" : relationship;
}
