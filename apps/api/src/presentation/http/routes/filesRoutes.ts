import { FILE_LIMITS, FILE_VARIANTS, attachFileSchema } from "@talaan/shared";
import express, { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { RecordFiles } from "../../../application/record/RecordFiles.js";
import { NotFoundError } from "../../../domain/errors.js";
import { safeFileName } from "../../../domain/file/rules.js";
import type { LocalFileStorage } from "../../../infrastructure/storage/LocalFileStorage.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { recordFileJson } from "../toJson.js";

function idParam(value: unknown) {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}

const contentQuery = z.object({
  variant: z.enum(FILE_VARIANTS).default("original"),
  // "1": save it instead of opening it in the browser
  download: z.literal("1").optional(),
});

export function filesRoutes(deps: {
  files: RecordFiles;
  // Only on a computer without Cloudinary
  localUploads: LocalFileStorage | null;
  requireAuth: RequestHandler;
  limit: RequestHandler;
}) {
  const router = Router();
  router.use(["/files", "/uploads"], deps.requireAuth);

  router.get("/records/:id/files", deps.requireAuth, async (req, res) => {
    const files = await deps.files.list(
      currentUserId(req),
      idParam(req.params.id),
    );
    res.json({ files: files.map(recordFileJson) });
  });

  router.post(
    "/records/:id/files/upload-target",
    deps.requireAuth,
    deps.limit,
    async (req, res) => {
      const target = await deps.files.uploadTarget(
        currentUserId(req),
        idParam(req.params.id),
      );
      res.json({ target });
    },
  );

  router.post(
    "/records/:id/files",
    deps.requireAuth,
    deps.limit,
    async (req, res) => {
      const input = attachFileSchema.parse(req.body);
      const file = await deps.files.attach(
        currentUserId(req),
        idParam(req.params.id),
        input.upload,
        input.name,
      );
      res.status(201).json({ file: recordFileJson(file) });
    },
  );

  // The file itself, after checking who's asking. Never a link to the storage.
  router.get("/files/:id/content", async (req, res) => {
    const query = contentQuery.parse(req.query);
    const opened = await deps.files.open(
      currentUserId(req),
      idParam(req.params.id),
      query.variant,
    );
    const name = safeFileName(opened.file.originalName, opened.file.format);
    res.setHeader("Content-Type", opened.contentType);
    // Health records: kept by this browser only, briefly
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader(
      "Content-Disposition",
      `${query.download ? "attachment" : "inline"}; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    );
    opened.body.on("error", (error) => {
      console.error(`Couldn't send file ${opened.file.id}:`, error);
      res.destroy(error);
    });
    opened.body.pipe(res);
  });

  router.delete("/files/:id", deps.limit, async (req, res) => {
    await deps.files.remove(currentUserId(req), idParam(req.params.id));
    res.status(204).end();
  });

  // Development only: the "upload straight to storage" step, without Cloudinary
  const local = deps.localUploads;
  if (local) {
    router.put(
      "/uploads/local",
      express.raw({ type: () => true, limit: FILE_LIMITS.maxBytes + 1 }),
      async (req, res) => {
        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        res.json(await local.receive(req.query, body));
      },
    );
  }

  return router;
}
