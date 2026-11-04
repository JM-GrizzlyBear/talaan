import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../../application/ports/PasswordHasher.js";

export class BcryptPasswordHasher implements PasswordHasher {
  // 12 rounds in production; the tests use fewer so they run fast
  constructor(private readonly saltRounds = 12) {}

  async hash(password: string) {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }
}
