import type { FamilyMembers } from "../application/family/FamilyMembers.js";
import { RecordAccess } from "../application/record/RecordAccess.js";
import { RecordFiles } from "../application/record/RecordFiles.js";
import { RecordTrash } from "../application/record/RecordTrash.js";
import { Records } from "../application/record/Records.js";
import { LocalFileStorage } from "../infrastructure/storage/LocalFileStorage.js";
import { activityRoutes } from "../presentation/http/routes/activityRoutes.js";
import { filesRoutes } from "../presentation/http/routes/filesRoutes.js";
import { recordsRoutes } from "../presentation/http/routes/recordsRoutes.js";
import { trashRoutes } from "../presentation/http/routes/trashRoutes.js";
import type { AppContext } from "./context.js";

// Records: adding, viewing and editing, the Trash, photos and PDFs, and the
// Activity history. Who may do what comes from family sharing.
export function recordsModule(
  { options, repos, limits, audit, requireAuth }: AppContext,
  members: FamilyMembers,
) {
  const { clock, fileStorage } = options;
  const access = new RecordAccess(
    repos.records,
    repos.familyProfiles,
    repos.users,
    members,
  );
  const records = new Records(
    repos.records,
    access,
    repos.familyAccess,
    audit,
    clock,
  );
  const trash = new RecordTrash(
    repos.records,
    access,
    repos.recordFiles,
    fileStorage,
    audit,
    clock,
  );

  const routers = [
    // Before recordsRoutes, so /records/trash isn't taken for a record id
    trashRoutes({ trash, requireAuth, limit: limits.records }),
    recordsRoutes({ records, requireAuth, limit: limits.records }),
    activityRoutes({ records, requireAuth }),
    filesRoutes({
      files: new RecordFiles(access, repos.recordFiles, fileStorage, audit),
      localUploads:
        fileStorage instanceof LocalFileStorage ? fileStorage : null,
      requireAuth,
      limit: limits.records,
    }),
  ];
  return { routers, trash };
}
