import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { EMAIL_CODE } from "@talaan/shared";
import type { SecretCodes } from "../../application/ports/SecretCodes.js";

// Codes come from the system's secure random generator. The stored hash is keyed
// with a server secret and the user's id, so a leaked table can't be reversed by
// simply trying all 1,000,000 codes.
export class HmacSecretCodes implements SecretCodes {
  constructor(private readonly key: string) {}

  newCode() {
    return String(randomInt(0, 10 ** EMAIL_CODE.length)).padStart(
      EMAIL_CODE.length,
      "0",
    );
  }

  hash(code: string, userId: string) {
    return createHmac("sha256", this.key)
      .update(`${userId}:${code}`)
      .digest("hex");
  }

  matches(code: string, userId: string, codeHash: string) {
    const expected = Buffer.from(codeHash, "hex");
    const actual = Buffer.from(this.hash(code, userId), "hex");
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  newToken() {
    return randomBytes(32).toString("base64url");
  }

  // A token is already 256 random bits, so a plain SHA-256 is enough
  hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  tokenMatches(token: string, tokenHash: string) {
    const expected = Buffer.from(tokenHash, "hex");
    const actual = Buffer.from(this.hashToken(token), "hex");
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}
