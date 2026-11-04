import { Router } from "express";
import type { Pool } from "pg";

// "Is the API up and can it reach the database?"
export function healthRoutes(pool: Pool) {
  const router = Router();
  router.get("/health", async (_req, res) => {
    await pool.query("select 1");
    res.json({ ok: true });
  });
  return router;
}
