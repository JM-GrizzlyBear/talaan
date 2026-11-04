import type {
  AccountEmails,
  EmailRecipient,
} from "../../src/application/ports/AccountEmails.js";
import { HmacSecretCodes } from "../../src/infrastructure/security/HmacSecretCodes.js";

// The real hashing, but every new code is the same, so tests know what to type
export class FixedSecretCodes extends HmacSecretCodes {
  constructor(private readonly code = "123456") {
    super("test-key-that-is-at-least-32-characters-long");
  }

  newCode() {
    return this.code;
  }
}

// Keeps every email instead of sending it
export class FakeEmails implements AccountEmails {
  readonly codes: { to: EmailRecipient; code: string }[] = [];
  readonly signInCodes: { to: EmailRecipient; code: string }[] = [];
  readonly changed: { to: EmailRecipient; at: Date }[] = [];

  async sendPasswordResetCode(to: EmailRecipient, code: string) {
    this.codes.push({ to, code });
  }

  async sendSignInCode(to: EmailRecipient, code: string) {
    this.signInCodes.push({ to, code });
  }

  async sendPasswordChanged(to: EmailRecipient, at: Date) {
    this.changed.push({ to, at });
  }

  clear() {
    this.codes.length = 0;
    this.signInCodes.length = 0;
    this.changed.length = 0;
  }
}
