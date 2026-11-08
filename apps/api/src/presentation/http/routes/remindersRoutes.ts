import {
  createReminderSchema,
  occurrenceActionSchema,
  reminderFieldsSchema,
} from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { Reminders } from "../../../application/reminder/Reminders.js";
import {
  agendaJson,
  reminderJson,
  reminderSummaryJson,
} from "../json/reminders.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { idParam } from "../params.js";

const DAY = 24 * 60 * 60 * 1000;

const ownerQuery = z.object({ ownerId: z.uuid().optional() });
const agendaQuery = ownerQuery.extend({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
});

export function remindersRoutes(deps: {
  reminders: Reminders;
  requireAuth: RequestHandler;
  limit: RequestHandler;
}) {
  const router = Router();
  router.use("/reminders", deps.requireAuth);

  router.get("/reminders", async (req, res) => {
    const query = ownerQuery.parse(req.query);
    const viewerId = currentUserId(req);
    const { role, reminders } = await deps.reminders.list(
      viewerId,
      query.ownerId ?? viewerId,
    );
    res.json({ role, reminders: reminders.map(reminderSummaryJson) });
  });

  // Every time in [from, to), at most 60 days
  router.get("/reminders/agenda", async (req, res) => {
    const query = agendaQuery.parse(req.query);
    const viewerId = currentUserId(req);
    const from = new Date(query.from);
    const to = new Date(
      Math.min(new Date(query.to).getTime(), from.getTime() + 60 * DAY),
    );
    const agenda = await deps.reminders.agenda(
      viewerId,
      query.ownerId ?? viewerId,
      from,
      to,
    );
    res.json(agendaJson(agenda));
  });

  router.post("/reminders", deps.limit, async (req, res) => {
    const { ownerId } = createReminderSchema.parse(req.body);
    const fields = reminderFieldsSchema.parse(req.body);
    const viewerId = currentUserId(req);
    const created = await deps.reminders.create(viewerId, ownerId, fields);
    res.status(201).json({
      reminder: reminderJson(await deps.reminders.get(viewerId, created.id)),
    });
  });

  router.get("/reminders/:id", async (req, res) => {
    const shown = await deps.reminders.get(
      currentUserId(req),
      idParam(req.params.id),
    );
    res.json({ reminder: reminderJson(shown) });
  });

  router.put("/reminders/:id", deps.limit, async (req, res) => {
    const fields = reminderFieldsSchema.parse(req.body);
    const viewerId = currentUserId(req);
    const id = idParam(req.params.id);
    await deps.reminders.update(viewerId, id, fields);
    res.json({
      reminder: reminderJson(await deps.reminders.get(viewerId, id)),
    });
  });

  router.delete("/reminders/:id", deps.limit, async (req, res) => {
    await deps.reminders.remove(currentUserId(req), idParam(req.params.id));
    res.status(204).end();
  });

  for (const [path, paused] of [
    ["pause", true],
    ["resume", false],
  ] as const) {
    router.post(`/reminders/:id/${path}`, deps.limit, async (req, res) => {
      await deps.reminders.setPaused(
        currentUserId(req),
        idParam(req.params.id),
        paused,
      );
      res.status(204).end();
    });
  }

  // Done, skip, snooze or undo one time
  router.post("/reminders/:id/occurrences", deps.limit, async (req, res) => {
    const action = occurrenceActionSchema.parse(req.body);
    await deps.reminders.act(
      currentUserId(req),
      idParam(req.params.id),
      action,
    );
    res.status(204).end();
  });

  // Your own alerts for this reminder
  router.put("/reminders/:id/my-alerts", deps.limit, async (req, res) => {
    const { muted } = z.object({ muted: z.boolean() }).parse(req.body);
    await deps.reminders.setMuted(
      currentUserId(req),
      idParam(req.params.id),
      muted,
    );
    res.status(204).end();
  });

  return router;
}
