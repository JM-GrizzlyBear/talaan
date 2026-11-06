import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { Records } from "../../../application/record/Records.js";
import { auditEntryJson } from "../json/audit.js";
import { currentUserId } from "../middleware/requireAuth.js";

const PAGE = 50;
const activityQuery = z.object({
  before: z.iso.datetime().optional(),
});

// Everything that happened in your own account, newest first, 50 at a time
export function activityRoutes(deps: {
  records: Records;
  requireAuth: RequestHandler;
}) {
  const router = Router();

  router.get("/activity", deps.requireAuth, async (req, res) => {
    const { before } = activityQuery.parse(req.query);
    const entries = await deps.records.activity(currentUserId(req), {
      limit: PAGE,
      before: before ? new Date(before) : undefined,
    });
    res.json({
      entries: entries.map(auditEntryJson),
      // Ask for the next page with ?before=<this>
      next:
        entries.length === PAGE
          ? entries[PAGE - 1].createdAt.toISOString()
          : null,
    });
  });

  return router;
}
