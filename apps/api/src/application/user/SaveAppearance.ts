import type { Appearance } from "@talaan/shared";
import { toSafeUser } from "../../domain/user/User.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";

// Colors, light or dark, and text size: saved with the account, so every
// phone and computer looks the same
export class SaveAppearance {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string, appearance: Appearance) {
    return toSafeUser(await this.users.updateAppearance(userId, appearance));
  }
}
