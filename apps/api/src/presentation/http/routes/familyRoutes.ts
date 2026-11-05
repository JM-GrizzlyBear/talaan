import { memberAccessSchema, type FamilyOverview } from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import type { FamilyMembers } from "../../../application/family/FamilyMembers.js";
import {
  familyMemberJson,
  familyProfileJson,
  sentInvitationJson,
  sharedWithMeJson,
} from "../json/family.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { idParam } from "../params.js";

// The Family page: who can see my records, whose records I can see, and the
// access in between. One way: owner → member.
export function familyRoutes(deps: {
  members: FamilyMembers;
  requireAuth: RequestHandler;
  // Per signed-in person, for changes
  userLimit: RequestHandler;
}) {
  const router = Router();

  router.get("/family", deps.requireAuth, async (req, res) => {
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

  // People who can see my records
  router.put(
    "/family/members/:userId",
    deps.requireAuth,
    deps.userLimit,
    async (req, res) => {
      const { access } = memberAccessSchema.parse(req.body);
      await deps.members.changeAccess(
        currentUserId(req),
        idParam(req.params.userId),
        access,
      );
      res.status(204).end();
    },
  );

  router.delete(
    "/family/members/:userId",
    deps.requireAuth,
    async (req, res) => {
      await deps.members.remove(currentUserId(req), idParam(req.params.userId));
      res.status(204).end();
    },
  );

  // People whose records I can see: stop seeing them
  router.delete(
    "/family/shared/:ownerId",
    deps.requireAuth,
    async (req, res) => {
      await deps.members.leave(currentUserId(req), idParam(req.params.ownerId));
      res.status(204).end();
    },
  );

  return router;
}
