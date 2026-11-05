import { INVITATION_DAYS, type InvitationStatus } from "@talaan/shared";
import type { FamilyInvitation } from "./FamilyInvitation.js";

export function invitationExpiry(now: Date) {
  return new Date(now.getTime() + INVITATION_DAYS * 24 * 60 * 60 * 1000);
}

// The status people see: a pending invitation past its date has expired
export function invitationStatus(
  invitation: Pick<FamilyInvitation, "status" | "expiresAt">,
  now: Date,
): InvitationStatus {
  if (
    invitation.status === "pending" &&
    now.getTime() >= invitation.expiresAt.getTime()
  ) {
    return "expired";
  }
  return invitation.status;
}

// What someone can do with an owner's records
export type AccessRole = "owner" | "manage" | "view";

export function canView(role: AccessRole | null) {
  return role !== null;
}

export function canManage(role: AccessRole | null) {
  return role === "owner" || role === "manage";
}
