import type { LockAfterMinutes } from "@talaan/shared";
import { toSafeUser } from "../../domain/user/User.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";

export class UpdateSecuritySettings {
  constructor(private readonly users: UserRepository) {}

  async execute(
    userId: string,
    settings: { lockAfterMinutes: LockAfterMinutes },
  ) {
    const user = await this.users.updateLockAfter(
      userId,
      settings.lockAfterMinutes,
    );
    return toSafeUser(user);
  }
}
