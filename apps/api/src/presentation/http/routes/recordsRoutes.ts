import {
  RECORD_TYPES,
  createRecordSchema,
  recordFieldsSchema,
} from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { Records } from "../../../application/record/Records.js";
import { NotFoundError } from "../../../domain/errors.js";
import { currentUserId } from "../middleware/requireAuth.js";
import {
  auditEntryJson,
  recordAccountJson,
  recordJson,
  recordSummaryJson,
  trashedRecordJson,
} from "../toJson.js";

function idParam(value: unknown) {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}

const listQuery = z.object({
  // Whose records; yours when left out
  ownerId: z.uuid().optional(),
  // "self": the account owner; a uuid: one of their profiles; left out: everyone
  profileId: z.union([z.literal("self"), z.uuid()]).optional(),
  type: z.enum(RECORD_TYPES).optional(),
});

const activityQuery = z.object({
  before: z.iso.datetime().optional(),
});

export function recordsRoutes(deps: {
  records: Records;
  requireAuth: RequestHandler;
  // Per signed-in person, for adding and changing records
  limit: RequestHandler;
}) {
  const router = Router();
  router.use(["/records", "/activity"], deps.requireAuth);

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

  // The Trash (only the owner opens it)
  router.get("/records/trash", async (req, res) => {
    const { ownerId } = z
      .object({ ownerId: z.uuid().optional() })
      .parse(req.query);
    const viewerId = currentUserId(req);
    const trashed = await deps.records.listTrash(viewerId, ownerId ?? viewerId);
    res.json({
      records: trashed.map((t) => trashedRecordJson(t.record, t.personName)),
    });
  });

  router.delete("/records/trash", deps.limit, async (req, res) => {
    const deleted = await deps.records.emptyTrash(currentUserId(req));
    res.json({ deleted });
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

  router.post("/records/:id/restore", deps.limit, async (req, res) => {
    await deps.records.restore(currentUserId(req), idParam(req.params.id));
    res.status(204).end();
  });

  router.delete("/records/:id/forever", deps.limit, async (req, res) => {
    await deps.records.deleteForever(
      currentUserId(req),
      idParam(req.params.id),
    );
    res.status(204).end();
  });

  router.get("/records/:id/history", async (req, res) => {
    const entries = await deps.records.history(
      currentUserId(req),
      idParam(req.params.id),
    );
    res.json({ entries: entries.map(auditEntryJson) });
  });

  // Everything that happened in your own account, newest first, 50 at a time
  router.get("/activity", async (req, res) => {
    const { before } = activityQuery.parse(req.query);
    const entries = await deps.records.activity(currentUserId(req), {
      limit: 50,
      before: before ? new Date(before) : undefined,
    });
    res.json({
      entries: entries.map(auditEntryJson),
      // Ask for the next page with ?before=<this>
      next: entries.length === 50 ? entries[49].createdAt.toISOString() : null,
    });
  });

  return router;
}
