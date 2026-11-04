import bcrypt from "bcryptjs";
import type { Pool } from "pg";
import { MARIAS_NOTE } from "../../fixtures/notes.js";
import { PASSWORD, USERS } from "../../fixtures/users.js";

// Hashed once (4 rounds: fast, fine for tests)
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

// Empties every table (except dbmate's list of migrations) and puts the same seed data back,
// so each test starts from exactly the same state whatever the test before it did
export async function resetDatabase(pool: Pool) {
  await pool.query("truncate notes, session, users restart identity cascade");

  for (const user of Object.values(USERS)) {
    await pool.query(
      "insert into users (id, username, email, password_hash) values ($1, $2, $3, $4)",
      [user.id, user.username, user.email, PASSWORD_HASH],
    );
  }
  await pool.query(
    `insert into notes (id, user_id, title, body, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $5)`,
    [
      MARIAS_NOTE.id,
      MARIAS_NOTE.userId,
      MARIAS_NOTE.title,
      MARIAS_NOTE.body,
      MARIAS_NOTE.at,
    ],
  );
}
