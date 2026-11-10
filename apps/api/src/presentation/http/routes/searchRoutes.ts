import { SEARCH_LIMITS } from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { Search } from "../../../application/search/Search.js";
import { currentUserId } from "../middleware/requireAuth.js";

const searchQuery = z.object({
  q: z
    .string()
    .trim()
    .max(SEARCH_LIMITS.maxLength, {
      error: `At most ${SEARCH_LIMITS.maxLength} characters`,
    })
    .default(""),
});

// GET /api/search?q=…
export function searchRoutes(deps: {
  search: Search;
  requireAuth: RequestHandler;
  limit: RequestHandler;
}) {
  const router = Router();
  router.get("/search", deps.requireAuth, deps.limit, async (req, res) => {
    const { q } = searchQuery.parse(req.query);
    res.setHeader("Cache-Control", "no-store");
    if (q.length < SEARCH_LIMITS.minLength) {
      res.json({ results: [], total: 0 });
      return;
    }
    res.json(await deps.search.find(currentUserId(req), q));
  });
  return router;
}
