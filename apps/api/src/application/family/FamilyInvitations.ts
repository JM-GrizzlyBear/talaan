import {
  FAMILY_LIMITS,
  fullName,
  type InviteFamilyInput,
} from "@talaan/shared";
import { EmailNotSetUpError } from "../../domain/emailCode/errors.js";
import { NotFoundError } from "../../domain/errors.js";
import type { FamilyAccessRepository } from "../../domain/family/FamilyAccessRepository.js";
import type { FamilyInvitation } from "../../domain/family/FamilyInvitation.js";
import type { FamilyInvitationRepository } from "../../domain/family/FamilyInvitationRepository.js";
import { FamilyError } from "../../domain/family/errors.js";
import {
  invitationExpiry,
  invitationStatus,
} from "../../domain/family/rules.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import { NotLoggedInError } from "../../domain/user/errors.js";
import { normalizeEmail } from "../../domain/user/rules.js";
import type { AccountEmails } from "../ports/AccountEmails.js";
import type { Clock } from "../ports/Clock.js";
import type { SecretCodes } from "../ports/SecretCodes.js";

const UNKNOWN_LINK =
  "That invitation link doesn't work. It may be incomplete, or a newer invitation replaced it.";

// Inviting family by email, and the invited person accepting or declining.
// The link's token proves the person can read that inbox; accepting also needs
// a Talaan account with that same email.
export class FamilyInvitations {
  constructor(
    private readonly users: UserRepository,
    private readonly invitations: FamilyInvitationRepository,
    private readonly access: FamilyAccessRepository,
    private readonly secrets: SecretCodes,
    private readonly clock: Clock,
    private readonly emails: AccountEmails | null,
  ) {}

  private requireEmails() {
    if (!this.emails) {
      throw new EmailNotSetUpError(
        "Invitations by email aren't set up on this server yet. Please try again later.",
      );
    }
    return this.emails;
  }

  private async send(invitation: FamilyInvitation, token: string) {
    const inviter = await this.users.findById(invitation.inviterId);
    if (!inviter) throw new NotLoggedInError();
    await this.requireEmails().sendFamilyInvitation(invitation.email, {
      inviterName: fullName(inviter),
      relationship: invitation.relationship,
      access: invitation.access,
      token,
      expiresAt: invitation.expiresAt,
    });
  }

  async invite(inviterId: string, input: InviteFamilyInput) {
    this.requireEmails();
    const inviter = await this.users.findById(inviterId);
    if (!inviter) throw new NotLoggedInError();
    const email = normalizeEmail(input.email);
    if (email === inviter.email) throw FamilyError.inviteYourself();
    if (await this.access.hasMemberWithEmail(inviterId, email)) {
      throw FamilyError.alreadyMember();
    }

    // Inviting the same email again just sends a fresh link
    const now = this.clock.now();
    const open = await this.invitations.listOpenForInviter(inviterId);
    const alreadyWaiting = open.some(
      (i) => i.email === email && invitationStatus(i, now) === "pending",
    );
    if (!alreadyWaiting) {
      const used =
        (await this.access.countMembers(inviterId)) +
        (await this.invitations.countPendingForInviter(inviterId, now));
      if (used >= FAMILY_LIMITS.members) {
        throw FamilyError.tooManyMembers(FAMILY_LIMITS.members);
      }
    }

    const token = this.secrets.newToken();
    const invitation = await this.invitations.upsertPending(
      {
        inviterId,
        email,
        relationship: input.relationship,
        access: input.access,
        tokenHash: this.secrets.hashToken(token),
        expiresAt: invitationExpiry(now),
      },
      now,
    );
    await this.send(invitation, token);
    return invitation;
  }

  private async findOwn(inviterId: string, id: string) {
    const invitation = await this.invitations.findById(id);
    if (
      !invitation ||
      invitation.inviterId !== inviterId ||
      invitation.status === "cancelled"
    ) {
      throw new NotFoundError("That invitation isn't on your list anymore.");
    }
    return invitation;
  }

  // A new link (the old one stops working) and 7 more days
  async resend(inviterId: string, id: string) {
    this.requireEmails();
    const invitation = await this.findOwn(inviterId, id);
    if (invitation.status === "accepted") throw FamilyError.cantRenewAccepted();
    if (await this.access.hasMemberWithEmail(inviterId, invitation.email)) {
      throw FamilyError.alreadyMember();
    }
    const now = this.clock.now();
    const token = this.secrets.newToken();
    const expiresAt = invitationExpiry(now);
    await this.invitations.renew(
      id,
      this.secrets.hashToken(token),
      now,
      expiresAt,
    );
    await this.send({ ...invitation, expiresAt }, token);
  }

  // Takes back a waiting invitation, or clears a declined one from the list
  async cancel(inviterId: string, id: string) {
    const invitation = await this.findOwn(inviterId, id);
    if (invitation.status === "accepted") throw FamilyError.cantRenewAccepted();
    await this.invitations.setStatus(id, "cancelled", this.clock.now());
  }

  private async byToken(token: string) {
    const invitation = await this.invitations.findByTokenHash(
      this.secrets.hashToken(token),
    );
    if (!invitation) throw new NotFoundError(UNKNOWN_LINK);
    return invitation;
  }

  // What the link shows. viewerId: whoever is signed in, if anyone.
  async preview(token: string, viewerId: string | null) {
    const invitation = await this.byToken(token);
    const inviter = await this.users.findById(invitation.inviterId);
    if (!inviter) throw new NotFoundError(UNKNOWN_LINK);
    const viewer = viewerId ? await this.users.findById(viewerId) : null;
    return {
      invitation,
      inviterName: fullName(inviter),
      status: invitationStatus(invitation, this.clock.now()),
      forThisAccount: viewer ? viewer.email === invitation.email : null,
    };
  }

  async accept(token: string, userId: string) {
    const invitation = await this.byToken(token);
    const now = this.clock.now();
    const status = invitationStatus(invitation, now);
    if (status !== "pending") throw FamilyError.invitationUnusable(status);

    const user = await this.users.findById(userId);
    if (!user) throw new NotLoggedInError();
    if (user.email !== invitation.email) {
      throw FamilyError.wrongAccount(invitation.email);
    }

    await this.access.save({
      ownerId: invitation.inviterId,
      memberId: user.id,
      relationship: invitation.relationship,
      access: invitation.access,
    });
    await this.invitations.setStatus(invitation.id, "accepted", now, user.id);
    return invitation;
  }

  // No account needed: anyone holding the link can say no
  async decline(token: string) {
    const invitation = await this.byToken(token);
    const now = this.clock.now();
    const status = invitationStatus(invitation, now);
    if (status !== "pending") throw FamilyError.invitationUnusable(status);
    await this.invitations.setStatus(invitation.id, "declined", now);
  }
}
