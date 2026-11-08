import type { Pool } from "pg";
import { PostgresAuditRepository } from "../infrastructure/database/PostgresAuditRepository.js";
import { PostgresEmailCodeRepository } from "../infrastructure/database/PostgresEmailCodeRepository.js";
import { PostgresFamilyAccessRepository } from "../infrastructure/database/PostgresFamilyAccessRepository.js";
import { PostgresFamilyInvitationRepository } from "../infrastructure/database/PostgresFamilyInvitationRepository.js";
import { PostgresFamilyProfileRepository } from "../infrastructure/database/PostgresFamilyProfileRepository.js";
import { PostgresLabelRepository } from "../infrastructure/database/PostgresLabelRepository.js";
import { PostgresPasskeyRepository } from "../infrastructure/database/PostgresPasskeyRepository.js";
import { PostgresPlaceRepository } from "../infrastructure/database/PostgresPlaceRepository.js";
import { PostgresRecordFileRepository } from "../infrastructure/database/PostgresRecordFileRepository.js";
import { PostgresRecordRepository } from "../infrastructure/database/PostgresRecordRepository.js";
import { PostgresSessionStore } from "../infrastructure/database/PostgresSessionStore.js";
import { PostgresTrustedBrowserRepository } from "../infrastructure/database/PostgresTrustedBrowserRepository.js";
import { PostgresUserRepository } from "../infrastructure/database/PostgresUserRepository.js";

// Every table's repository, on one connection pool
export function createRepositories(pool: Pool) {
  return {
    users: new PostgresUserRepository(pool),
    sessions: new PostgresSessionStore(pool),
    resetCodes: new PostgresEmailCodeRepository(pool, "password_reset_codes"),
    signInCodes: new PostgresEmailCodeRepository(pool, "sign_in_codes"),
    passkeys: new PostgresPasskeyRepository(pool),
    trustedBrowsers: new PostgresTrustedBrowserRepository(pool),
    familyAccess: new PostgresFamilyAccessRepository(pool),
    familyInvitations: new PostgresFamilyInvitationRepository(pool),
    familyProfiles: new PostgresFamilyProfileRepository(pool),
    records: new PostgresRecordRepository(pool),
    recordFiles: new PostgresRecordFileRepository(pool),
    audit: new PostgresAuditRepository(pool),
    places: new PostgresPlaceRepository(pool),
    labels: new PostgresLabelRepository(pool),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
