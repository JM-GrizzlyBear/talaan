import { AccountDeletion } from "../application/account/AccountDeletion.js";
import { AccountExport } from "../application/account/AccountExport.js";
import type { RecordAccess } from "../application/record/RecordAccess.js";
import { rateLimit } from "../presentation/http/middleware/rateLimit.js";
import { currentUserId } from "../presentation/http/middleware/requireAuth.js";
import { yourDataRoutes } from "../presentation/http/routes/yourDataRoutes.js";
import type { AppContext } from "./context.js";

// Deleting accounts (also needed by sign-in, which brings suspended ones back)
export function makeAccountDeletion({ options, repos, audit }: AppContext) {
  return new AccountDeletion(
    repos.accounts,
    repos.users,
    options.passwordHasher,
    repos.sessions,
    repos.familyAccess,
    options.fileStorage,
    options.emails,
    audit,
    options.clock,
  );
}

// Your data: download everything, or delete the account
export function yourDataModule(
  { options, repos, limits, audit, requireAuth }: AppContext,
  access: RecordAccess,
  deletion: AccountDeletion,
) {
  const { clock } = options;
  const exporter = new AccountExport(
    repos.users,
    access,
    repos.records,
    repos.recordFiles,
    repos.medicalIds,
    repos.places,
    repos.reminders,
    repos.shareLinks,
    repos.familyAccess,
    repos.audit,
    options.fileStorage,
    options.emails,
    audit,
    clock,
  );
  return {
    routers: [
      yourDataRoutes({
        exporter,
        deletion,
        requireAuth,
        // A whole copy is big: a few an hour is plenty
        exportLimit: rateLimit({
          windowMs: 60 * 60 * 1000,
          max: 5,
          clock,
          key: (req) => currentUserId(req),
          message:
            "You downloaded your data a few times already. Please try again in an hour.",
        }),
        deleteLimit: limits.tries(limits.userKey),
      }),
    ],
  };
}
