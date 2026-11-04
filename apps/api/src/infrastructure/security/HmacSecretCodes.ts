import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { RESET_CODE } from "@talaan/shared";
import type { SecretCodes } from "../../application/ports/SecretCodes.js";

// Codes come from the system's secure random generator. The stored hash is keyed
// with a server secret and the user's id, so a leaked table can't be reversed by
// simply trying all 1,000,000 codes.
export class HmacSecretCodes implements SecretCodes {
  constructor(private readonly key: string) {}

  newCode() {
    return String(randomInt(0, 10 ** RESET_CODE.length)).padStart(
      RESET_CODE.length,
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
}
