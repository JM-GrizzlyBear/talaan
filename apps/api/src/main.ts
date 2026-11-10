import { buildApp } from "./buildApp.js";
import { readEnv } from "./config/env.js";
import { createPool } from "./infrastructure/database/pool.js";
import { SmtpAccountEmails } from "./infrastructure/email/SmtpAccountEmails.js";
import { BcryptPasswordHasher } from "./infrastructure/security/BcryptPasswordHasher.js";
import { HmacSecretCodes } from "./infrastructure/security/HmacSecretCodes.js";
import { WebPushSender } from "./infrastructure/push/WebPushSender.js";
import { SystemClock } from "./infrastructure/time/SystemClock.js";
import { CloudinaryFileStorage } from "./infrastructure/storage/CloudinaryFileStorage.js";
import { LocalFileStorage } from "./infrastructure/storage/LocalFileStorage.js";
import { SimpleWebAuthnCeremonies } from "./infrastructure/webauthn/SimpleWebAuthnCeremonies.js";

const env = readEnv();
const pool = createPool(env.databaseUrl);

if (!env.smtp) {
  console.warn(
    "SMTP_HOST isn't set: Forgot password can't send codes, and two-step sign-in is skipped. See apps/api/.env.example.",
  );
}

if (!env.storage) {
  console.warn(
    "CLOUDINARY_URL isn't set: uploading photos and PDFs is off. See apps/api/.env.example.",
  );
} else if (env.storage.kind === "cloudinary") {
  console.log(
    `Uploads go to Cloudinary (${env.storage.settings.cloudName}, folder ${env.storage.settings.folder})`,
  );
} else if (env.storage.kind === "local") {
  console.log(
    `Uploads go to the folder ${env.storage.dir} (set CLOUDINARY_URL to use Cloudinary)`,
  );
}

const app = buildApp({
  pool,
  sessionSecret: env.sessionSecret,
  passwordHasher: new BcryptPasswordHasher(),
  secretCodes: new HmacSecretCodes(env.sessionSecret),
  emails: env.smtp ? new SmtpAccountEmails(env.smtp) : null,
  passkeyCeremonies: new SimpleWebAuthnCeremonies(env.webAuthn),
  fileStorage:
    env.storage?.kind === "cloudinary"
      ? new CloudinaryFileStorage(env.storage.settings)
      : env.storage?.kind === "local"
        ? new LocalFileStorage(env.storage.dir, env.sessionSecret)
        : null,
  pushSender: env.webPush ? new WebPushSender(env.webPush) : null,
  clock: new SystemClock(),
  secureCookie: env.secureCookie,
  trustProxy: env.trustProxy,
  webDistDir: env.webDistDir,
});

const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

// Records 30 days in the Trash are deleted for good: at start, then every hour.
// (Opening the Trash also does it, so nothing old shows even between runs.)
async function emptyOldTrash() {
  try {
    const deleted = await app.purgeExpiredTrash();
    if (deleted > 0)
      console.log(`Deleted ${deleted} records from the Trash (30 days)`);
  } catch (error) {
    console.error("Couldn't empty old records from the Trash:", error);
  }
}
void emptyOldTrash();
const trashTimer = setInterval(emptyOldTrash, 60 * 60 * 1000);
trashTimer.unref();

// Suspended accounts: the 6-month and week-before emails, and deleting those
// suspended for a year. At start, then every hour.
async function deleteOldAccounts() {
  try {
    const deleted = await app.runAccountDeletions();
    if (deleted > 0) console.log(`Deleted ${deleted} suspended accounts`);
  } catch (error) {
    console.error("Couldn't check suspended accounts:", error);
  }
}
void deleteOldAccounts();
const accountTimer = setInterval(deleteOldAccounts, 60 * 60 * 1000);
accountTimer.unref();

// Reminder alerts that are due go out every minute. On Render's free plan the
// server sleeps after 15 minutes without visits, so something has to visit
// it (README → "Reminders and alerts"); it catches up on waking.
let sendingAlerts = false;
async function sendReminderAlerts() {
  if (sendingAlerts) return;
  sendingAlerts = true;
  try {
    await app.sendDueReminderAlerts();
  } catch (error) {
    console.error("Couldn't send reminder alerts:", error);
  } finally {
    sendingAlerts = false;
  }
}
void sendReminderAlerts();
const alertTimer = setInterval(sendReminderAlerts, 60 * 1000);
alertTimer.unref();

async function shutDown() {
  clearInterval(trashTimer);
  clearInterval(accountTimer);
  clearInterval(alertTimer);
  server.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);
