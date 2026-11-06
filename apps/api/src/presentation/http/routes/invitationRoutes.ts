import {
  invitationTokenSchema,
  inviteFamilySchema,
  maskEmail,
  type InvitationPreview,
} from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import type { FamilyInvitations } from "../../../application/family/FamilyInvitations.js";
import { sentInvitationJson } from "../json/family.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { idParam } from "../params.js";

// Family invitations: sending, and the email link's page (looking and
// declining need no account; accepting needs the invited email's account)
export function invitationRoutes(deps: {
  invitations: FamilyInvitations;
  requireAuth: RequestHandler;
  // Per visitor, for the invitation link's steps
  limit: RequestHandler;
  // Per signed-in person, for changes
  userLimit: RequestHandler;
  // Invitations sent to one email address in a day
  inviteEmailLimit: RequestHandler;
  // Emails sent for one invitation in a day
  resendLimit: RequestHandler;
}) {
  const router = Router();

  router.post("/family/invitations/lookup", deps.limit, async (req, res) => {
    const { token } = invitationTokenSchema.parse(req.body);
    // A locked session still counts as "this person", for the right message
    const preview = await deps.invitations.preview(
      token,
      req.session.userId ?? null,
    );
    const body: InvitationPreview = {
      inviterName: preview.inviterName,
      email: maskEmail(preview.invitation.email),
      relationship: preview.invitation.relationship,
      access: preview.invitation.access,
      status: preview.status,
      expiresAt: preview.invitation.expiresAt.toISOString(),
      forThisAccount: preview.forThisAccount,
    };
    res.json(body);
  });

  router.post(
    "/family/invitations/accept",
    deps.requireAuth,
    deps.limit,
    async (req, res) => {
      const { token } = invitationTokenSchema.parse(req.body);
      await deps.invitations.accept(token, currentUserId(req));
      res.status(204).end();
    },
  );

  router.post("/family/invitations/decline", deps.limit, async (req, res) => {
    const { token } = invitationTokenSchema.parse(req.body);
    await deps.invitations.decline(token);
    res.status(204).end();
  });

  // Sending, sending again, cancelling: the inviter only
  router.post(
    "/family/invitations",
    deps.requireAuth,
    deps.userLimit,
    deps.inviteEmailLimit,
    async (req, res) => {
      const input = inviteFamilySchema.parse(req.body);
      const invitation = await deps.invitations.invite(
        currentUserId(req),
        input,
      );
      res
        .status(201)
        .json({ invitation: sentInvitationJson(invitation, "pending") });
    },
  );

  router.post(
    "/family/invitations/:id/resend",
    deps.requireAuth,
    deps.userLimit,
    deps.resendLimit,
    async (req, res) => {
      await deps.invitations.resend(currentUserId(req), idParam(req.params.id));
      res.status(204).end();
    },
  );

  router.delete(
    "/family/invitations/:id",
    deps.requireAuth,
    async (req, res) => {
      await deps.invitations.cancel(currentUserId(req), idParam(req.params.id));
      res.status(204).end();
    },
  );

  return router;
}
