import { CodeError } from "../../domain/emailCode/errors.js";
import type { EmailCodeRepository } from "../../domain/emailCode/EmailCodeRepository.js";
import { isCodeUsable, triesLeft } from "../../domain/emailCode/rules.js";
import { toSafeUser } from "../../domain/user/User.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import { SignInExpiredError } from "../../domain/user/signIn.js";
import type { Clock } from "../ports/Clock.js";
import type { SecretCodes } from "../ports/SecretCodes.js";

// The second step: the code from the email. A wrong guess uses up one of the 3 tries;
// the right code works once.
export class VerifySignInCode {
  constructor(
    private readonly users: UserRepository,
    private readonly codes: EmailCodeRepository,
    private readonly secrets: SecretCodes,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string, code: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new SignInExpiredError();
    const saved = await this.codes.find(user.id);
    if (!saved || !isCodeUsable(saved, this.clock.now())) {
      throw CodeError.unusable();
    }
    if (!this.secrets.matches(code.trim(), user.id, saved.codeHash)) {
      const used = await this.codes.addTry(user.id);
      throw CodeError.wrong(triesLeft(used));
    }
    await this.codes.remove(user.id);
    return toSafeUser(user);
  }
}
