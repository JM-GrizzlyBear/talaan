import {
  familyProfileSchema,
  invitationTokenSchema,
  inviteFamilySchema,
  maskEmail,
  memberAccessSchema,
  type FamilyOverview,
  type InvitationPreview,
} from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { FamilyInvitations } from "../../../application/family/FamilyInvitations.js";
import type { FamilyMembers } from "../../../application/family/FamilyMembers.js";
import type { FamilyProfiles } from "../../../application/family/FamilyProfiles.js";
import { NotFoundError } from "../../../domain/errors.js";
import { currentUserId } from "../middleware/requireAuth.js";
import {
  familyMemberJson,
  familyProfileJson,
  sentInvitationJson,
  sharedWithMeJson,
} from "../toJson.js";

function idParam(value: unknown) {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}

// Sharing records with family, one way: owner → member
export function familyRoutes(deps: {
  invitations: FamilyInvitations;
  members: FamilyMembers;
  profiles: FamilyProfiles;
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

  // The invitation link (no account needed to look or to decline)

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

  // Everything else is for the signed-in person
  router.use("/family", deps.requireAuth);

  router.get("/family", async (req, res) => {
    const overview = await deps.members.overview(currentUserId(req));
    const body: FamilyOverview = {
      members: overview.members.map(familyMemberJson),
      invitations: overview.invitations.map((i) =>
        sentInvitationJson(i.invitation, i.status),
      ),
      profiles: overview.profiles.map(familyProfileJson),
      sharedWithMe: overview.sharedWithMe.map((s) =>
        sharedWithMeJson(s.owner, s.profiles),
      ),
    };
    res.json(body);
  });

  router.post(
    "/family/invitations",
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
    deps.userLimit,
    deps.resendLimit,
    async (req, res) => {
      await deps.invitations.resend(currentUserId(req), idParam(req.params.id));
      res.status(204).end();
    },
  );

  router.delete("/family/invitations/:id", async (req, res) => {
    await deps.invitations.cancel(currentUserId(req), idParam(req.params.id));
    res.status(204).end();
  });

  // People who can see my records
  router.put("/family/members/:userId", deps.userLimit, async (req, res) => {
    const { access } = memberAccessSchema.parse(req.body);
    await deps.members.changeAccess(
      currentUserId(req),
      idParam(req.params.userId),
      access,
    );
    res.status(204).end();
  });

  router.delete("/family/members/:userId", async (req, res) => {
    await deps.members.remove(currentUserId(req), idParam(req.params.userId));
    res.status(204).end();
  });

  // People whose records I can see: stop seeing them
  router.delete("/family/shared/:ownerId", async (req, res) => {
    await deps.members.leave(currentUserId(req), idParam(req.params.ownerId));
    res.status(204).end();
  });

  // Profiles for family without their own email or phone
  router.post("/family/profiles", deps.userLimit, async (req, res) => {
    const input = familyProfileSchema.parse(req.body);
    const profile = await deps.profiles.add(currentUserId(req), input);
    res.status(201).json({ profile: familyProfileJson(profile) });
  });

  router.put("/family/profiles/:id", deps.userLimit, async (req, res) => {
    const input = familyProfileSchema.parse(req.body);
    const profile = await deps.profiles.update(
      currentUserId(req),
      idParam(req.params.id),
      input,
    );
    res.json({ profile: familyProfileJson(profile) });
  });

  router.delete("/family/profiles/:id", async (req, res) => {
    await deps.profiles.remove(currentUserId(req), idParam(req.params.id));
    res.status(204).end();
  });

  return router;
}
