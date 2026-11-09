import { alertSettingsSchema, pushSubscriptionSchema } from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import type { AlertSettings } from "../../../application/reminder/AlertSettings.js";
import { alertSettingsJson } from "../json/reminders.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { idParam } from "../params.js";

// Your own reminder alerts: email and browser notifications
export function alertRoutes(deps: {
  settings: AlertSettings;
  requireAuth: RequestHandler;
  limit: RequestHandler;
}) {
  const router = Router();
  router.use("/account/alerts", deps.requireAuth);

  router.get("/account/alerts", async (req, res) => {
    res.json(alertSettingsJson(await deps.settings.get(currentUserId(req))));
  });

  router.put("/account/alerts", deps.limit, async (req, res) => {
    const userId = currentUserId(req);
    await deps.settings.set(userId, alertSettingsSchema.parse(req.body));
    res.json(alertSettingsJson(await deps.settings.get(userId)));
  });

  // This browser agreed to show notifications
  router.post("/account/alerts/devices", deps.limit, async (req, res) => {
    const device = await deps.settings.addDevice(
      currentUserId(req),
      pushSubscriptionSchema.parse(req.body),
    );
    res.status(201).json({ device: { id: device.id } });
  });

  router.delete("/account/alerts/devices/:id", deps.limit, async (req, res) => {
    await deps.settings.removeDevice(
      currentUserId(req),
      idParam(req.params.id),
    );
    res.status(204).end();
  });

  router.post("/account/alerts/test", deps.limit, async (req, res) => {
    const sent = await deps.settings.testPush(currentUserId(req));
    res.json({ sent });
  });

  return router;
}
