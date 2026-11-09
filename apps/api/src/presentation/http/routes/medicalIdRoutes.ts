import { emergencySettingsSchema, medicalIdSchema } from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { MedicalIds } from "../../../application/medical/MedicalIds.js";
import { currentUserId } from "../middleware/requireAuth.js";

const person = z.object({
  ownerId: z.uuid().optional(),
  // "self": the account owner
  profileId: z.union([z.literal("self"), z.uuid()]).default("self"),
});
// Whose Medical ID: yours when no owner is given
const who = (from: unknown, viewerId: string) => {
  const p = person.parse(from);
  return {
    ownerId: p.ownerId ?? viewerId,
    profileId: p.profileId === "self" ? null : p.profileId,
  };
};

export function medicalIdRoutes(deps: {
  ids: MedicalIds;
  requireAuth: RequestHandler;
  limit: RequestHandler;
  // Per visitor: the public emergency page
  publicLimit: RequestHandler;
}) {
  const router = Router();
  router.use("/medical-id", deps.requireAuth);

  router.get("/medical-id", async (req, res) => {
    const viewerId = currentUserId(req);
    const p = who(req.query, viewerId);
    res.json({
      medicalId: await deps.ids.get(viewerId, p.ownerId, p.profileId),
    });
  });

  router.put("/medical-id", deps.limit, async (req, res) => {
    const viewerId = currentUserId(req);
    const p = who(req.body, viewerId);
    const fields = medicalIdSchema.parse(req.body.fields ?? {});
    await deps.ids.save(viewerId, p.ownerId, p.profileId, fields);
    res.json({
      medicalId: await deps.ids.get(viewerId, p.ownerId, p.profileId),
    });
  });

  router.post("/medical-id/checked", deps.limit, async (req, res) => {
    const viewerId = currentUserId(req);
    const p = who(req.body, viewerId);
    await deps.ids.markChecked(viewerId, p.ownerId, p.profileId);
    res.status(204).end();
  });

  router.put("/medical-id/emergency", deps.limit, async (req, res) => {
    const viewerId = currentUserId(req);
    const p = who(req.body, viewerId);
    const settings = emergencySettingsSchema.parse(req.body);
    const newCode = req.body.newCode === true;
    await deps.ids.setEmergency(
      viewerId,
      p.ownerId,
      p.profileId,
      settings,
      newCode,
    );
    res.json({
      medicalId: await deps.ids.get(viewerId, p.ownerId, p.profileId),
    });
  });

  // No sign-in: what the emergency QR opens
  router.get("/emergency/:token", deps.publicLimit, async (req, res) => {
    const token = z
      .string()
      .regex(/^[A-Za-z0-9_-]{20,64}$/)
      .safeParse(req.params.token);
    if (!token.success) {
      res
        .status(404)
        .json({ message: "This emergency code isn't on anymore." });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex");
    res.json({ emergency: await deps.ids.emergency(token.data) });
  });

  return router;
}
