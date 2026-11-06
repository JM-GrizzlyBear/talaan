import { familyProfileSchema } from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import type { FamilyProfiles } from "../../../application/family/FamilyProfiles.js";
import { familyProfileJson } from "../json/family.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { idParam } from "../params.js";

// Profiles for family without their own email or phone (a young child, a
// lolo). Only the account owner adds, changes or removes them.
export function familyProfileRoutes(deps: {
  profiles: FamilyProfiles;
  requireAuth: RequestHandler;
  // Per signed-in person, for changes
  userLimit: RequestHandler;
}) {
  const router = Router();
  router.use("/family/profiles", deps.requireAuth);

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
