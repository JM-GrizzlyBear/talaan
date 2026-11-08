import { blankLabelsSchema, placeFieldsSchema } from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { Labels } from "../../../application/place/Labels.js";
import type { Places } from "../../../application/place/Places.js";
import { blankLabelJson, labelJson, placeJson } from "../json/places.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { labelCodeParam } from "../params.js";

const blankQuery = z.object({ ownerId: z.uuid().optional() });

// QR labels: what a scanned label leads to, and blank labels printed ahead.
// /labels/blank is set up before /labels/:code ("blank" is never a code).
export function labelsRoutes(deps: {
  labels: Labels;
  places: Places;
  requireAuth: RequestHandler;
  limit: RequestHandler;
}) {
  const router = Router();
  router.use("/labels", deps.requireAuth);

  router.get("/labels/blank", async (req, res) => {
    const query = blankQuery.parse(req.query);
    const viewerId = currentUserId(req);
    const labels = await deps.labels.listBlank(
      viewerId,
      query.ownerId ?? viewerId,
    );
    res.json({ labels: labels.map(blankLabelJson) });
  });

  router.post("/labels/blank", deps.limit, async (req, res) => {
    const { ownerId, count } = blankLabelsSchema.parse(req.body);
    const codes = await deps.labels.createBlank(
      currentUserId(req),
      ownerId,
      count,
    );
    res.status(201).json({ codes });
  });

  router.get("/labels/:code", async (req, res) => {
    const found = await deps.labels.lookup(
      currentUserId(req),
      labelCodeParam(req.params.code),
    );
    res.json({ label: labelJson(found) });
  });

  // Naming a blank label: what is it stuck on?
  router.post("/labels/:code/place", deps.limit, async (req, res) => {
    const fields = placeFieldsSchema.parse(req.body);
    const viewerId = currentUserId(req);
    const place = await deps.labels.name(
      viewerId,
      labelCodeParam(req.params.code),
      fields,
    );
    res
      .status(201)
      .json({ place: placeJson(await deps.places.get(viewerId, place.id)) });
  });

  return router;
}
