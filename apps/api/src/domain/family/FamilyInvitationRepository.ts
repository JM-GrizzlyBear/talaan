import type { AccessLevel, FamilyRelationship } from "@talaan/shared";
import type {
  FamilyInvitation,
  StoredInvitationStatus,
} from "./FamilyInvitation.js";

export interface NewInvitation {
  inviterId: string;
  email: string;
  relationship: FamilyRelationship;
  access: AccessLevel;
  tokenHash: string;
  expiresAt: Date;
}

export interface FamilyInvitationRepository {
  // A new pending invitation, or a fresh link for the one already waiting
  // for this email (new token, details and expiry)
  upsertPending(
    invitation: NewInvitation,
    sentAt: Date,
  ): Promise<FamilyInvitation>;
  findById(id: string): Promise<FamilyInvitation | null>;
  findByTokenHash(tokenHash: string): Promise<FamilyInvitation | null>;
  // Pending and declined ones (accepted ones are members; cancelled ones are gone)
  listOpenForInviter(inviterId: string): Promise<FamilyInvitation[]>;
  countPendingForInviter(inviterId: string, now: Date): Promise<number>;
  // Sends a declined or expired invitation again with a new token
  renew(
    id: string,
    tokenHash: string,
    sentAt: Date,
    expiresAt: Date,
  ): Promise<void>;
  setStatus(
    id: string,
    status: StoredInvitationStatus,
    at: Date,
    inviteeId?: string,
  ): Promise<void>;
}
