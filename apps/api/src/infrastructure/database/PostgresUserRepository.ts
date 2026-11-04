import type { Pool } from "pg";
import type { User } from "../../domain/user/User.js";
import type {
  NewUser,
  UserRepository,
} from "../../domain/user/UserRepository.js";

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = "id, username, email, password_hash, created_at, updated_at";

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  private async findOne(where: string, value: string) {
    const result = await this.pool.query<UserRow>(
      `select ${COLUMNS} from users where ${where} = $1`,
      [value],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  async findById(id: string) {
    return await this.findOne("id", id);
  }

  async findByUsername(username: string) {
    return await this.findOne("username", username);
  }

  async findByEmail(email: string) {
    return await this.findOne("email", email);
  }

  async create(user: NewUser) {
    const result = await this.pool.query<UserRow>(
      `insert into users (username, email, password_hash)
       values ($1, $2, $3)
       returning ${COLUMNS}`,
      [user.username, user.email, user.passwordHash],
    );
    return toUser(result.rows[0]);
  }
}
