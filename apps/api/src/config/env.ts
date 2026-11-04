import "dotenv/config";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing. See apps/api/.env.example.`);
  return value;
}

// Reads and checks every setting once, at startup, so a mistake fails loudly right away
export function readEnv() {
  const sessionSecret = required("SESSION_SECRET");
  if (sessionSecret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be at least 32 characters (openssl rand -hex 32)",
    );
  }
  const isProduction = process.env.NODE_ENV === "production";

  return {
    port: Number(process.env.PORT ?? 4000),
    databaseUrl: required("DATABASE_URL"),
    sessionSecret,
    isProduction,
    // HTTPS-only cookies. On by default in production; set COOKIE_SECURE=false to test
    // the production Docker image on http://localhost.
    secureCookie:
      (process.env.COOKIE_SECURE ?? String(isProduction)) === "true",
    // Only set in production (the Docker image sets it)
    webDistDir: process.env.WEB_DIST_DIR?.trim() || undefined,
  };
}
