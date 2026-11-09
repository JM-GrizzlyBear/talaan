import { newShareSchema, shareSettingsSchema } from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { ShareLinks } from "../../../application/share/ShareLinks.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { shareLinkJson } from "../json/shares.js";
import { idParam } from "../params.js";

const ownerQuery = z.object({ ownerId: z.uuid().optional() });

// Making and looking after links for doctors (signed in)
export function shareRoutes(deps: {
  links: ShareLinks;
  requireAuth: RequestHandler;
  limit: RequestHandler;
}) {
  const router = Router();
  router.use("/shares", deps.requireAuth);

  router.get("/shares", async (req, res) => {
    const viewerId = currentUserId(req);
    const ownerId = ownerQuery.parse(req.query).ownerId ?? viewerId;
    const links = await deps.links.list(viewerId, ownerId);
    res.json({ links: links.map(shareLinkJson) });
  });

  router.post("/shares", deps.limit, async (req, res) => {
    const viewerId = currentUserId(req);
    const input = newShareSchema.parse(req.body);
    const id = await deps.links.create(
      viewerId,
      input.ownerId ?? viewerId,
      input,
    );
    res
      .status(201)
      .json({ link: shareLinkJson(await deps.links.get(viewerId, id)) });
  });

  router.get("/shares/:id", async (req, res) => {
    const viewerId = currentUserId(req);
    res.json({
      link: shareLinkJson(
        await deps.links.get(viewerId, idParam(req.params.id)),
      ),
    });
  });

  router.put("/shares/:id/settings", deps.limit, async (req, res) => {
    const viewerId = currentUserId(req);
    const id = idParam(req.params.id);
    await deps.links.update(viewerId, id, shareSettingsSchema.parse(req.body));
    res.json({ link: shareLinkJson(await deps.links.get(viewerId, id)) });
  });

  router.post("/shares/:id/stop", deps.limit, async (req, res) => {
    const viewerId = currentUserId(req);
    const id = idParam(req.params.id);
    await deps.links.stop(viewerId, id);
    res.json({ link: shareLinkJson(await deps.links.get(viewerId, id)) });
  });

  router.delete("/shares/:id", deps.limit, async (req, res) => {
    await deps.links.remove(currentUserId(req), idParam(req.params.id));
    res.status(204).end();
  });

  return router;
}
