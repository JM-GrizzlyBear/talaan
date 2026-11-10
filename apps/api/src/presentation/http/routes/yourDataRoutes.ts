import { deleteAccountSchema } from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import type { AccountDeletion } from "../../../application/account/AccountDeletion.js";
import type { AccountExport } from "../../../application/account/AccountExport.js";
import { writeZip } from "../../../infrastructure/export/writeZip.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { endSession } from "../session.js";
import { browserLabel } from "../userAgent.js";

// Downloading your data, and deleting your account (only your own)
export function yourDataRoutes(deps: {
  exporter: AccountExport;
  deletion: AccountDeletion;
  requireAuth: RequestHandler;
  exportLimit: RequestHandler;
  deleteLimit: RequestHandler;
}) {
  const router = Router();

  router.get(
    "/account/export",
    deps.requireAuth,
    deps.exportLimit,
    async (req, res) => {
      const { fileName, entries } = await deps.exporter.build(
        currentUserId(req),
        browserLabel(req.headers["user-agent"]),
      );
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      );
      await writeZip(entries, res);
    },
  );

  router.post(
    "/account/delete",
    deps.requireAuth,
    deps.deleteLimit,
    async (req, res) => {
      const input = deleteAccountSchema.parse(req.body);
      const userId = currentUserId(req);
      if (input.mode === "now") {
        await deps.deletion.deleteNow(userId, input.password);
        await endSession(req);
        res.json({ deleted: true });
        return;
      }
      const { deleteAfter } = await deps.deletion.suspend(
        userId,
        input.password,
      );
      await endSession(req);
      res.json({ deleted: false, deleteAfter: deleteAfter.toISOString() });
    },
  );

  return router;
}
