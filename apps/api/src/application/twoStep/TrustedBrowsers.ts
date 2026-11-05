import { NotFoundError } from "../../domain/errors.js";
import type { TrustedBrowserRepository } from "../../domain/trustedBrowser/TrustedBrowserRepository.js";
import {
  isTrustStillValid,
  parseTrustCookie,
  trustedUntil,
} from "../../domain/trustedBrowser/rules.js";
import type { Clock } from "../ports/Clock.js";
import type { SecretCodes } from "../ports/SecretCodes.js";

// Browsers that passed two-step sign-in and asked to be remembered for 30 days
export class TrustedBrowsers {
  constructor(
    private readonly browsers: TrustedBrowserRepository,
    private readonly secrets: SecretCodes,
    private readonly clock: Clock,
  ) {}

  // Returns the cookie value ("<id>.<token>") and when it stops working
  async remember(userId: string, label: string) {
    const token = this.secrets.newToken();
    const browser = await this.browsers.create({
      userId,
      tokenHash: this.secrets.hashToken(token),
      label,
      expiresAt: trustedUntil(this.clock.now()),
    });
    return { cookie: `${browser.id}.${token}`, expiresAt: browser.expiresAt };
  }

  // The browser's id when the cookie belongs to this person and still works
  async check(userId: string, cookie: string | undefined) {
    const parsed = parseTrustCookie(cookie);
    if (!parsed) return null;
    const browser = await this.browsers.find(parsed.id);
    const now = this.clock.now();
    if (
      !browser ||
      browser.userId !== userId ||
      !isTrustStillValid(browser, now) ||
      !this.secrets.tokenMatches(parsed.token, browser.tokenHash)
    ) {
      return null;
    }
    await this.browsers.touch(browser.id, now);
    return browser.id;
  }

  // Which remembered browser this cookie is, without checking whose (for "This browser" in the list)
  idOf(cookie: string | undefined) {
    return parseTrustCookie(cookie)?.id ?? null;
  }

  async list(userId: string) {
    return await this.browsers.listActive(userId, this.clock.now());
  }

  async forget(userId: string, id: string) {
    if (!(await this.browsers.remove(id, userId))) {
      throw new NotFoundError("That browser isn't on your list anymore.");
    }
  }

  async forgetAll(userId: string) {
    await this.browsers.removeAll(userId);
  }
}
