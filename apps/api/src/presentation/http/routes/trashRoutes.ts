import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { RecordTrash } from "../../../application/record/RecordTrash.js";
import { trashedRecordJson } from "../json/records.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { idParam } from "../params.js";

// The Trash: only the owner opens it, restores, or deletes for good
export function trashRoutes(deps: {
  trash: RecordTrash;
  requireAuth: RequestHandler;
  limit: RequestHandler;
}) {
  const router = Router();
  router.use("/records", deps.requireAuth);

  router.get("/records/trash", async (req, res) => {
    const { ownerId } = z
      .object({ ownerId: z.uuid().optional() })
      .parse(req.query);
    const viewerId = currentUserId(req);
    const trashed = await deps.trash.list(viewerId, ownerId ?? viewerId);
    res.json({
      records: trashed.map((t) => trashedRecordJson(t.record, t.personName)),
    });
  });

  router.delete("/records/trash", deps.limit, async (req, res) => {
    const deleted = await deps.trash.empty(currentUserId(req));
    res.json({ deleted });
  });

  router.post("/records/:id/restore", deps.limit, async (req, res) => {
    await deps.trash.restore(currentUserId(req), idParam(req.params.id));
    res.status(204).end();
  });

  router.delete("/records/:id/forever", deps.limit, async (req, res) => {
    await deps.trash.deleteForever(currentUserId(req), idParam(req.params.id));
    res.status(204).end();
  });

  return router;
}
