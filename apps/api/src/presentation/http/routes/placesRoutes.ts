import {
  FILE_VARIANTS,
  createPlaceSchema,
  placeFieldsSchema,
  placePhotoSchema,
} from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { PlacePhotos } from "../../../application/place/PlacePhotos.js";
import type { Places } from "../../../application/place/Places.js";
import { placeJson, placeListJson } from "../json/places.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { idParam } from "../params.js";

const listQuery = z.object({
  // Whose places; yours when left out
  ownerId: z.uuid().optional(),
});

const photoQuery = z.object({
  variant: z.enum(FILE_VARIANTS).default("preview"),
});

// Places where paper records are kept, and a photo of each
export function placesRoutes(deps: {
  places: Places;
  photos: PlacePhotos;
  requireAuth: RequestHandler;
  // Per signed-in person, for changes
  limit: RequestHandler;
}) {
  const router = Router();
  router.use("/places", deps.requireAuth);

  router.get("/places", async (req, res) => {
    const query = listQuery.parse(req.query);
    const viewerId = currentUserId(req);
    const { role, places } = await deps.places.list(
      viewerId,
      query.ownerId ?? viewerId,
    );
    res.json(placeListJson(role, places));
  });

  router.post("/places", deps.limit, async (req, res) => {
    const { ownerId } = createPlaceSchema.parse(req.body);
    const fields = placeFieldsSchema.parse(req.body);
    const viewerId = currentUserId(req);
    const created = await deps.places.create(viewerId, ownerId, fields);
    res
      .status(201)
      .json({ place: placeJson(await deps.places.get(viewerId, created.id)) });
  });

  router.get("/places/:id", async (req, res) => {
    const shown = await deps.places.get(
      currentUserId(req),
      idParam(req.params.id),
    );
    res.json({ place: placeJson(shown) });
  });

  router.put("/places/:id", deps.limit, async (req, res) => {
    const fields = placeFieldsSchema.parse(req.body);
    const viewerId = currentUserId(req);
    const id = idParam(req.params.id);
    await deps.places.update(viewerId, id, fields);
    res.json({ place: placeJson(await deps.places.get(viewerId, id)) });
  });

  router.delete("/places/:id", deps.limit, async (req, res) => {
    await deps.places.remove(currentUserId(req), idParam(req.params.id));
    res.status(204).end();
  });

  router.post(
    "/places/:id/photo/upload-target",
    deps.limit,
    async (req, res) => {
      const target = await deps.photos.uploadTarget(
        currentUserId(req),
        idParam(req.params.id),
      );
      res.json({ target });
    },
  );

  router.post("/places/:id/photo", deps.limit, async (req, res) => {
    const { upload } = placePhotoSchema.parse(req.body);
    const viewerId = currentUserId(req);
    const id = idParam(req.params.id);
    await deps.photos.attach(viewerId, id, upload);
    res.json({ place: placeJson(await deps.places.get(viewerId, id)) });
  });

  // The photo itself, after checking who's asking. Never a link to the storage.
  router.get("/places/:id/photo", async (req, res) => {
    const { variant } = photoQuery.parse(req.query);
    const opened = await deps.photos.open(
      currentUserId(req),
      idParam(req.params.id),
      variant,
    );
    res.setHeader("Content-Type", opened.contentType);
    res.setHeader("Cache-Control", "private, max-age=300");
    opened.body.on("error", (error) => {
      console.error(
        `Couldn't send the photo of place ${req.params.id}:`,
        error,
      );
      res.destroy(error);
    });
    opened.body.pipe(res);
  });

  router.delete("/places/:id/photo", deps.limit, async (req, res) => {
    await deps.photos.remove(currentUserId(req), idParam(req.params.id));
    res.status(204).end();
  });

  return router;
}
