import type { Pool } from "pg";
import type { AccountEmails } from "../application/ports/AccountEmails.js";
import type { Clock } from "../application/ports/Clock.js";
import type { FileStorage } from "../application/ports/FileStorage.js";
import type { PasskeyCeremonies } from "../application/ports/PasskeyCeremonies.js";
import type { PasswordHasher } from "../application/ports/PasswordHasher.js";
import type { SecretCodes } from "../application/ports/SecretCodes.js";

// Everything the app needs from outside. main.ts passes the real ones; the
// tests pass fakes (a fixed clock, emails kept in memory, a fake passkey device).
export interface BuildAppOptions {
  pool: Pool;
  sessionSecret: string;
  passwordHasher: PasswordHasher;
  secretCodes: SecretCodes;
  // null: no email service set up, so Forgot password can't send codes
  emails: AccountEmails | null;
  passkeyCeremonies: PasskeyCeremonies;
  // Where photos and PDFs go (Cloudinary, or a folder while developing). null: uploads off.
  fileStorage: FileStorage | null;
  clock: Clock;
  // HTTPS-only cookies (production)
  secureCookie: boolean;
  // How many proxies sit in front (0: none). Lets rate limits see real IP addresses.
  trustProxy: number;
  // The built website (apps/web/dist). When set, the API serves it too: one server, one address.
  webDistDir?: string;
  // Sign-in, sign-up and unlock tries per visitor every 15 minutes
  authLimit?: number;
  // Forgot-password codes per email address every 15 minutes
  resetEmailLimit?: number;
  // New two-step sign-in codes per person every 15 minutes
  signInCodeLimit?: number;
  // Family invitations to one email address (and emails for one invitation) per day
  invitationEmailLimit?: number;
  // Record changes per person every 15 minutes
  recordsLimit?: number;
  // Makes QR label codes (tests pass a predictable one)
  makeLabelCode?: () => string;
}
