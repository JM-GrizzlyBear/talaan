import {
  RECORD_TYPES,
  createRecordSchema,
  recordFieldsSchema,
} from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { Records } from "../../../application/record/Records.js";
import { auditEntryJson } from "../json/audit.js";
import {
  recordAccountJson,
  recordJson,
  recordSummaryJson,
} from "../json/records.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { idParam } from "../params.js";

const listQuery = z.object({
  // Whose records; yours when left out
  ownerId: z.uuid().optional(),
  // "self": the account owner; a uuid: one of their profiles; left out: everyone
  profileId: z.union([z.literal("self"), z.uuid()]).optional(),
  type: z.enum(RECORD_TYPES).optional(),
});

// Adding, viewing, editing and moving records to the Trash.
// Mounted after trashRoutes, so /records/trash isn't taken for a record id.
export function recordsRoutes(deps: {
  records: Records;
  requireAuth: RequestHandler;
  // Per signed-in person, for adding and changing records
  limit: RequestHandler;
}) {
  const router = Router();
  router.use("/records", deps.requireAuth);

  // Accounts you can open (yours, and those shared with you) and the people in each
  router.get("/records/accounts", async (req, res) => {
    const accounts = await deps.records.accounts(currentUserId(req));
    res.json({
      accounts: accounts.map((a) => recordAccountJson(a.household, a.role)),
    });
  });

  router.get("/records", async (req, res) => {
    const query = listQuery.parse(req.query);
    const viewerId = currentUserId(req);
    const result = await deps.records.list(
      viewerId,
      query.ownerId ?? viewerId,
      {
        profileId:
          query.profileId === "self" ? null : (query.profileId ?? undefined),
        type: query.type,
      },
    );
    res.json({
      role: result.role,
      records: result.records.map((r) =>
        recordSummaryJson(r.record, r.personName),
      ),
    });
  });

  router.post("/records", deps.limit, async (req, res) => {
    const { ownerId } = createRecordSchema.parse(req.body);
    const fields = recordFieldsSchema.parse(req.body);
    const viewerId = currentUserId(req);
    const created = await deps.records.create(viewerId, ownerId, fields);
    const shown = await deps.records.get(viewerId, created.id);
    res.status(201).json({
      record: recordJson(shown.record, shown.personName, shown.role),
    });
  });

  router.get("/records/:id", async (req, res) => {
    const shown = await deps.records.get(
      currentUserId(req),
      idParam(req.params.id),
    );
    res.json({
      record: recordJson(shown.record, shown.personName, shown.role),
    });
  });

  router.put("/records/:id", deps.limit, async (req, res) => {
    const fields = recordFieldsSchema.parse(req.body);
    const viewerId = currentUserId(req);
    const id = idParam(req.params.id);
    await deps.records.update(viewerId, id, fields);
    const shown = await deps.records.get(viewerId, id);
    res.json({
      record: recordJson(shown.record, shown.personName, shown.role),
    });
  });

  // Moves it to the Trash
  router.delete("/records/:id", deps.limit, async (req, res) => {
    await deps.records.moveToTrash(currentUserId(req), idParam(req.params.id));
    res.status(204).end();
  });

  router.get("/records/:id/history", async (req, res) => {
    const entries = await deps.records.history(
      currentUserId(req),
      idParam(req.params.id),
    );
    res.json({ entries: entries.map(auditEntryJson) });
  });

  return router;
}
