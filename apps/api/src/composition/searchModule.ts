import type { RecordAccess } from "../application/record/RecordAccess.js";
import { Search } from "../application/search/Search.js";
import { rateLimit } from "../presentation/http/middleware/rateLimit.js";
import { currentUserId } from "../presentation/http/middleware/requireAuth.js";
import { searchRoutes } from "../presentation/http/routes/searchRoutes.js";
import type { AppContext } from "./context.js";

// Searching everything someone can see
export function searchModule(
  { options, repos, requireAuth }: AppContext,
  access: RecordAccess,
) {
  const search = new Search(
    access,
    repos.familyAccess,
    repos.records,
    repos.places,
    repos.reminders,
    repos.medicalIds,
  );
  return {
    routers: [
      searchRoutes({
        search,
        requireAuth,
        // Search as you type: one person, many quick searches
        limit: rateLimit({
          windowMs: 5 * 60 * 1000,
          max: 300,
          clock: options.clock,
          key: (req) => currentUserId(req),
          message: "Too many searches. Please wait a minute.",
        }),
      }),
    ],
  };
}
