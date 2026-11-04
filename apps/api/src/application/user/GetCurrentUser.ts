import { toSafeUser } from "../../domain/user/User.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import { NotLoggedInError } from "../../domain/user/errors.js";

export class GetCurrentUser {
  constructor(private readonly users: UserRepository) {}

  // The session can outlive the user (for example after they were deleted)
  async execute(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotLoggedInError();
    return toSafeUser(user);
  }
}
