import { randomBytes } from "node:crypto";
import { ShareAlerts } from "../application/share/ShareAlerts.js";
import { SharedPages } from "../application/share/SharedPages.js";
import { ShareLinks } from "../application/share/ShareLinks.js";
import type { RecordAccess } from "../application/record/RecordAccess.js";
import { rateLimit } from "../presentation/http/middleware/rateLimit.js";
import { sharedRoutes } from "../presentation/http/routes/sharedRoutes.js";
import { shareRoutes } from "../presentation/http/routes/shareRoutes.js";
import type { AppContext } from "./context.js";

// 24 random bytes: codes nobody can guess (32 characters)
const randomCode = () => randomBytes(24).toString("base64url");

// Links for doctors: the family makes them; the doctor opens one without
// signing in, with a PIN when there is one
export function sharesModule(
  { options, repos, limits, audit, requireAuth }: AppContext,
  access: RecordAccess,
) {
  const { clock } = options;
  const links = new ShareLinks(
    repos.shareLinks,
    access,
    repos.records,
    options.passwordHasher,
    audit,
    clock,
    randomCode,
  );
  const pages = new SharedPages(
    repos.shareLinks,
    access,
    repos.records,
    repos.recordFiles,
    repos.medicalIds,
    options.fileStorage,
    options.passwordHasher,
    new ShareAlerts(
      repos.users,
      repos.alertSettings,
      options.emails,
      options.pushSender ?? null,
    ),
    audit,
    clock,
    randomCode,
  );
  return {
    routers: [
      shareRoutes({ links, requireAuth, limit: limits.records }),
      sharedRoutes({
        pages,
        secureCookie: options.secureCookie,
        // A page with photos asks for each one
        publicLimit: rateLimit({
          windowMs: 15 * 60 * 1000,
          max: 600,
          clock,
          message: "Too many requests. Please wait a few minutes.",
        }),
        pinLimit: limits.tries(),
      }),
    ],
  };
}
