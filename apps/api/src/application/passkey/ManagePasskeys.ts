import { NotFoundError } from "../../domain/errors.js";
import type { PasskeyRepository } from "../../domain/passkey/PasskeyRepository.js";

export class ManagePasskeys {
  constructor(private readonly passkeys: PasskeyRepository) {}

  async list(userId: string) {
    return await this.passkeys.listForUser(userId);
  }

  // The device keeps its copy; it just won't work for Talaan anymore
  async remove(userId: string, id: string) {
    if (!(await this.passkeys.remove(id, userId))) {
      throw new NotFoundError("That passkey isn't on your list anymore.");
    }
  }
}
