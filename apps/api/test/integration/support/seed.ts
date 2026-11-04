import bcrypt from "bcryptjs";
import type { Pool } from "pg";
import { PASSWORD, USERS } from "../../fixtures/users.js";

// Hashed once (4 rounds: fast, fine for tests)
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

// Empties every table (except dbmate's list of migrations) and puts the same seed data back,
// so each test starts from exactly the same state whatever the test before it did
export async function resetDatabase(pool: Pool) {
  await pool.query(
    "truncate session, password_reset_codes, users restart identity cascade",
  );

  for (const user of Object.values(USERS)) {
    await pool.query(
      `insert into users (id, name, email, password_hash, privacy_consent_at)
       values ($1, $2, $3, $4, now())`,
      [user.id, user.name, user.email, PASSWORD_HASH],
    );
  }
}
