import type { Pool } from "pg";
import type { Note, NoteContent } from "../../domain/note/Note.js";
import type { NoteRepository } from "../../domain/note/NoteRepository.js";

interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = "id, user_id, title, body, created_at, updated_at";

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Every query filters by user_id, so one user can never touch another user's notes
export class PostgresNoteRepository implements NoteRepository {
  constructor(private readonly pool: Pool) {}

  async listByOwner(userId: string) {
    const result = await this.pool.query<NoteRow>(
      `select ${COLUMNS} from notes
       where user_id = $1
       order by updated_at desc, id`,
      [userId],
    );
    return result.rows.map(toNote);
  }

  async findOwned(id: string, userId: string) {
    const result = await this.pool.query<NoteRow>(
      `select ${COLUMNS} from notes where id = $1 and user_id = $2`,
      [id, userId],
    );
    return result.rows[0] ? toNote(result.rows[0]) : null;
  }

  async create(userId: string, content: NoteContent) {
    const result = await this.pool.query<NoteRow>(
      `insert into notes (user_id, title, body)
       values ($1, $2, $3)
       returning ${COLUMNS}`,
      [userId, content.title, content.body],
    );
    return toNote(result.rows[0]);
  }

  async update(id: string, userId: string, content: NoteContent) {
    const result = await this.pool.query<NoteRow>(
      `update notes set title = $3, body = $4, updated_at = now()
       where id = $1 and user_id = $2
       returning ${COLUMNS}`,
      [id, userId, content.title, content.body],
    );
    return result.rows[0] ? toNote(result.rows[0]) : null;
  }

  async delete(id: string, userId: string) {
    const result = await this.pool.query(
      "delete from notes where id = $1 and user_id = $2",
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
