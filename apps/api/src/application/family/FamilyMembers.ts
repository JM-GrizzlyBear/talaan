import { ACCESS_LABELS, fullName, type AccessLevel } from "@talaan/shared";
import { NotFoundError } from "../../domain/errors.js";
import type { FamilyAccessRepository } from "../../domain/family/FamilyAccessRepository.js";
import type { FamilyInvitationRepository } from "../../domain/family/FamilyInvitationRepository.js";
import type { FamilyProfileRepository } from "../../domain/family/FamilyProfileRepository.js";
import {
  invitationStatus,
  type AccessRole,
} from "../../domain/family/rules.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { Clock } from "../ports/Clock.js";

// Who can see my records, whose records I can see, and the profiles in between
export class FamilyMembers {
  constructor(
    private readonly access: FamilyAccessRepository,
    private readonly invitations: FamilyInvitationRepository,
    private readonly profiles: FamilyProfileRepository,
    private readonly clock: Clock,
    private readonly audit: AuditTrail,
  ) {}

  // The other person in an owner → member pair, for the history
  private async describe(
    ownerId: string,
    memberId: string,
    of: "owner" | "member",
  ) {
    const list =
      of === "member"
        ? await this.access.listMembers(ownerId)
        : await this.access.listOwners(memberId);
    const match = list.find((a) =>
      of === "member" ? a.memberId === memberId : a.ownerId === ownerId,
    );
    return match ? `${fullName(match.person)} (${match.person.email})` : null;
  }

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
    const before = await this.access.find(ownerId, memberId);
    const who = await this.describe(ownerId, memberId, "member");
    if (
      !before ||
      !who ||
      !(await this.access.updateAccess(ownerId, memberId, access))
    ) {
      throw new NotFoundError("That person can't see your records anymore.");
    }
    if (before.access === access) return;
    await this.audit.log({
      ownerId,
      action: "family.access_changed",
      actorId: ownerId,
      subject: who,
      changes: [
        {
          field: "Access",
          from: ACCESS_LABELS[before.access].name,
          to: ACCESS_LABELS[access].name,
        },
      ],
    });
  }

  // The owner stops sharing with someone
  async remove(ownerId: string, memberId: string) {
    const who = await this.describe(ownerId, memberId, "member");
    if (!who || !(await this.access.remove(ownerId, memberId))) {
      throw new NotFoundError("That person can't see your records anymore.");
    }
    await this.audit.log({
      ownerId,
      action: "family.removed",
      actorId: ownerId,
      subject: who,
    });
  }

  // A member stops seeing someone's records
  async leave(memberId: string, ownerId: string) {
    const who = await this.describe(ownerId, memberId, "member");
    if (!who || !(await this.access.remove(ownerId, memberId))) {
      throw new NotFoundError("You can't see those records anymore.");
    }
    // In the owner's history: they should know who stopped seeing their records
    await this.audit.log({
      ownerId,
      action: "family.left",
      actorId: memberId,
      subject: who,
    });
  }

  // What the viewer may do with the owner's records (the records PRs use this).
  // One way: owner → member only.
  async roleFor(viewerId: string, ownerId: string): Promise<AccessRole | null> {
    if (viewerId === ownerId) return "owner";
    const access = await this.access.find(ownerId, viewerId);
    return access?.access ?? null;
  }
}
