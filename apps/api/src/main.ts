import { buildApp } from "./buildApp.js";
import { readEnv } from "./config/env.js";
import { createPool } from "./infrastructure/database/pool.js";
import { SmtpAccountEmails } from "./infrastructure/email/SmtpAccountEmails.js";
import { BcryptPasswordHasher } from "./infrastructure/security/BcryptPasswordHasher.js";
import { HmacSecretCodes } from "./infrastructure/security/HmacSecretCodes.js";
import { SystemClock } from "./infrastructure/time/SystemClock.js";
import { SimpleWebAuthnCeremonies } from "./infrastructure/webauthn/SimpleWebAuthnCeremonies.js";

const env = readEnv();
const pool = createPool(env.databaseUrl);

if (!env.smtp) {
  console.warn(
    "SMTP_HOST isn't set: Forgot password can't send codes, and two-step sign-in is skipped. See apps/api/.env.example.",
  );
}

const app = buildApp({
  pool,
  sessionSecret: env.sessionSecret,
  passwordHasher: new BcryptPasswordHasher(),
  secretCodes: new HmacSecretCodes(env.sessionSecret),
  emails: env.smtp ? new SmtpAccountEmails(env.smtp) : null,
  passkeyCeremonies: new SimpleWebAuthnCeremonies(env.webAuthn),
  clock: new SystemClock(),
  secureCookie: env.secureCookie,
  trustProxy: env.trustProxy,
  webDistDir: env.webDistDir,
});

const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

async function shutDown() {
  server.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);
