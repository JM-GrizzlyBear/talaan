import { buildApp } from "./buildApp.js";
import { readEnv } from "./config/env.js";
import { createPool } from "./infrastructure/database/pool.js";
import { BcryptPasswordHasher } from "./infrastructure/security/BcryptPasswordHasher.js";
import { SystemClock } from "./infrastructure/time/SystemClock.js";

const env = readEnv();
const pool = createPool(env.databaseUrl);

const app = buildApp({
  pool,
  sessionSecret: env.sessionSecret,
  passwordHasher: new BcryptPasswordHasher(),
  clock: new SystemClock(),
  secureCookie: env.secureCookie,
  trustProxy: env.isProduction,
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
