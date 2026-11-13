import { Router } from "express";
import type { Pool } from "pg";

export function healthRoutes(pool: Pool) {
  const router = Router();
  // "Is the API up and can it reach the database?"
  router.get("/health", async (_req, res) => {
    await pool.query("select 1");
    res.json({ ok: true });
  });
  // "Is the API up?" without touching the database: what a keep-awake visit
  // (cron-job.org) and the app's wake-up call use, so the free database can
  // still sleep
  router.get("/ping", (_req, res) => {
    res.set("Cache-Control", "no-store").json({ ok: true });
  });
  return router;
}
