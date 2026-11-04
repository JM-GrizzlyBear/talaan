import { ResetCodeError } from "../../domain/passwordReset/errors.js";
import type { ResetCodeRepository } from "../../domain/passwordReset/ResetCodeRepository.js";
import {
  isResetCodeUsable,
  triesLeft,
} from "../../domain/passwordReset/rules.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import { normalizeEmail } from "../../domain/user/rules.js";
import type { Clock } from "../ports/Clock.js";
import type { SecretCodes } from "../ports/SecretCodes.js";

// Step 2: is this the code we emailed? A wrong guess uses up one of the 3 tries.
export class CheckResetCode {
  constructor(
    private readonly users: UserRepository,
    private readonly codes: ResetCodeRepository,
    private readonly secrets: SecretCodes,
    private readonly clock: Clock,
  ) {}

  async execute(input: { email: string; code: string }) {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    const saved = user ? await this.codes.find(user.id) : null;
    if (!user || !saved || !isResetCodeUsable(saved, this.clock.now())) {
      throw ResetCodeError.unusable();
    }
    if (!this.secrets.matches(input.code.trim(), user.id, saved.codeHash)) {
      const used = await this.codes.addTry(user.id);
      throw ResetCodeError.wrong(triesLeft(used));
    }
    return user;
  }
}
