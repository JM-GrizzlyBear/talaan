import { randomBytes } from "node:crypto";
import { MedicalIds } from "../application/medical/MedicalIds.js";
import type { RecordAccess } from "../application/record/RecordAccess.js";
import { medicalIdRoutes } from "../presentation/http/routes/medicalIdRoutes.js";
import type { AppContext } from "./context.js";

// 24 random bytes: a code nobody can guess (32 characters)
const emergencyToken = () => randomBytes(24).toString("base64url");

export function medicalModule(
  { options, repos, limits, audit, requireAuth }: AppContext,
  access: RecordAccess,
) {
  const ids = new MedicalIds(
    repos.medicalIds,
    access,
    audit,
    options.clock,
    emergencyToken,
  );
  return {
    routers: [
      medicalIdRoutes({
        ids,
        requireAuth,
        limit: limits.records,
        publicLimit: limits.tries(),
      }),
    ],
  };
}
