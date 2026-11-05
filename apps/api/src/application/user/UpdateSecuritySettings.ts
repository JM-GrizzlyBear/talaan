import type { LockAfterMinutes } from "@talaan/shared";
import { toSafeUser } from "../../domain/user/User.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import {
  NotLoggedInError,
  WrongPasswordError,
} from "../../domain/user/errors.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";

export interface SecuritySettingsChange {
  lockAfterMinutes?: LockAfterMinutes;
  twoStepEnabled?: boolean;
  // Needed to turn two-step sign-in off, so someone at an unlocked screen can't
  currentPassword?: string;
}

export class UpdateSecuritySettings {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
  ) {}

  async execute(userId: string, change: SecuritySettingsChange) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotLoggedInError();

    const turningTwoStepOff =
      change.twoStepEnabled === false && user.twoStepEnabled;
    if (
      turningTwoStepOff &&
      !(await this.passwords.compare(
        change.currentPassword ?? "",
        user.passwordHash,
      ))
    ) {
      throw new WrongPasswordError("currentPassword");
    }

    const updated = await this.users.updateSecurity(userId, {
      lockAfterMinutes: change.lockAfterMinutes,
      twoStepEnabled: change.twoStepEnabled,
    });
    return toSafeUser(updated);
  }
}
