import type { AccessLevel } from "@talaan/shared";
import { NotFoundError } from "../../domain/errors.js";
import type { FamilyAccessRepository } from "../../domain/family/FamilyAccessRepository.js";
import type { FamilyInvitationRepository } from "../../domain/family/FamilyInvitationRepository.js";
import type { FamilyProfileRepository } from "../../domain/family/FamilyProfileRepository.js";
import {
  invitationStatus,
  type AccessRole,
} from "../../domain/family/rules.js";
import type { Clock } from "../ports/Clock.js";

// Who can see my records, whose records I can see, and the profiles in between
export class FamilyMembers {
  constructor(
    private readonly access: FamilyAccessRepository,
    private readonly invitations: FamilyInvitationRepository,
    private readonly profiles: FamilyProfileRepository,
    private readonly clock: Clock,
  ) {}

  async overview(userId: string) {
    const now = this.clock.now();
    const [members, sent, owners] = await Promise.all([
      this.access.listMembers(userId),
      this.invitations.listOpenForInviter(userId),
      this.access.listOwners(userId),
    ]);
    const allProfiles = await this.profiles.listForOwners([
      userId,
      ...owners.map((o) => o.ownerId),
    ]);
    return {
      members,
      invitations: sent.map((invitation) => ({
        invitation,
        status: invitationStatus(invitation, now) as
          "pending" | "expired" | "declined",
      })),
      profiles: allProfiles.filter((p) => p.ownerId === userId),
      sharedWithMe: owners.map((owner) => ({
        owner,
        profiles: allProfiles.filter((p) => p.ownerId === owner.ownerId),
      })),
    };
  }

  async changeAccess(ownerId: string, memberId: string, access: AccessLevel) {
    if (!(await this.access.updateAccess(ownerId, memberId, access))) {
      throw new NotFoundError("That person can't see your records anymore.");
    }
  }

  // The owner stops sharing with someone
  async remove(ownerId: string, memberId: string) {
    if (!(await this.access.remove(ownerId, memberId))) {
      throw new NotFoundError("That person can't see your records anymore.");
    }
  }

  // A member stops seeing someone's records
  async leave(memberId: string, ownerId: string) {
    if (!(await this.access.remove(ownerId, memberId))) {
      throw new NotFoundError("You can't see those records anymore.");
    }
  }

  // What the viewer may do with the owner's records (the records PRs use this).
  // One way: owner → member only.
  async roleFor(viewerId: string, ownerId: string): Promise<AccessRole | null> {
    if (viewerId === ownerId) return "owner";
    const access = await this.access.find(ownerId, viewerId);
    return access?.access ?? null;
  }
}
