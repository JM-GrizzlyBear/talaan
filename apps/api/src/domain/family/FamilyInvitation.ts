import type { AccessLevel, FamilyRelationship } from "@talaan/shared";

export type StoredInvitationStatus =
  "pending" | "accepted" | "declined" | "cancelled";

export interface FamilyInvitation {
  id: string;
  inviterId: string;
  // Lowercase. Only the account with this email can accept.
  email: string;
  relationship: FamilyRelationship;
  access: AccessLevel;
  tokenHash: string;
  status: StoredInvitationStatus;
  inviteeId: string | null;
  createdAt: Date;
  sentAt: Date;
  expiresAt: Date;
  respondedAt: Date | null;
}
