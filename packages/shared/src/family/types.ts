import type { AccessLevel, FamilyRelationship } from "./constants.js";

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
