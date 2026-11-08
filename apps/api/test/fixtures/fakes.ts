import type {
  AccountEmails,
  EmailRecipient,
  FamilyInvitationEmail,
  ReminderAlert,
} from "../../src/application/ports/AccountEmails.js";
import type {
  PushMessage,
  PushSender,
  PushTarget,
} from "../../src/application/ports/PushSender.js";
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
  readonly invitations: { to: string; invitation: FamilyInvitationEmail }[] =
    [];
  readonly changed: { to: EmailRecipient; at: Date }[] = [];
  readonly reminders: { to: EmailRecipient; alert: ReminderAlert }[] = [];

  async sendPasswordResetCode(to: EmailRecipient, code: string) {
    this.codes.push({ to, code });
  }

  async sendSignInCode(to: EmailRecipient, code: string) {
    this.signInCodes.push({ to, code });
  }

  async sendFamilyInvitation(to: string, invitation: FamilyInvitationEmail) {
    this.invitations.push({ to, invitation });
  }

  async sendPasswordChanged(to: EmailRecipient, at: Date) {
    this.changed.push({ to, at });
  }

  async sendReminderAlert(to: EmailRecipient, alert: ReminderAlert) {
    this.reminders.push({ to, alert });
  }

  clear() {
    this.reminders.length = 0;
    this.codes.length = 0;
    this.signInCodes.length = 0;
    this.invitations.length = 0;
    this.changed.length = 0;
  }
}

// Keeps every notification; endpoints with "gone" in them act like browsers
// that turned notifications off
export class FakePush implements PushSender {
  readonly publicKey = "test-public-key";
  readonly sent: { target: PushTarget; message: PushMessage }[] = [];

  async send(target: PushTarget, message: PushMessage) {
    if (target.endpoint.includes("gone")) return "gone" as const;
    this.sent.push({ target, message });
    return "sent" as const;
  }

  clear() {
    this.sent.length = 0;
  }
}
