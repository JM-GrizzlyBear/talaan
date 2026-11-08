import bcrypt from "bcryptjs";
import type { Pool } from "pg";
import { PASSWORD, USERS } from "../../fixtures/users.js";

// Hashed once (4 rounds: fast, fine for tests)
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

// The seeded users start with two-step sign-in off, so most tests sign in with
// just the password. twoStep.test.ts turns it on.
// Empties every table (except dbmate's list of migrations) and puts the same seed data back,
// so each test starts from exactly the same state whatever the test before it did
export async function resetDatabase(pool: Pool) {
  await pool.query(
    "truncate session, password_reset_codes, sign_in_codes, passkeys, trusted_browsers, audit_log, labels, places, records, family_access, family_invitations, family_profiles, users restart identity cascade",
  );

  for (const user of Object.values(USERS)) {
    await pool.query(
      `insert into users (id, first_name, middle_name, last_name, email, password_hash, two_step_enabled, privacy_consent_at)
       values ($1, $2, $3, $4, $5, $6, false, now())`,
      [
        user.id,
        user.firstName,
        user.middleName,
        user.lastName,
        user.email,
        PASSWORD_HASH,
      ],
    );
  }
}
