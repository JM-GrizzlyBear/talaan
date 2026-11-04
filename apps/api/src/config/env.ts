import "dotenv/config";
import type { SmtpSettings } from "../infrastructure/email/SmtpAccountEmails.js";
import { readWebAuthn } from "./webauthn.js";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing. See apps/api/.env.example.`);
  return value;
}

function optional(name: string) {
  return process.env[name]?.trim() || undefined;
}

// The website's address: emails link to it and passkeys belong to it.
// Locally it defaults to the Vite dev server.
function readAppUrl(isProduction: boolean) {
  const value = isProduction ? required("APP_URL") : optional("APP_URL");
  return (value ?? "http://localhost:5173").replace(/\/+$/, "");
}

// Email is on when SMTP_HOST is set. Then MAIL_FROM is needed too.
function readSmtp(appUrl: string): SmtpSettings | null {
  const host = optional("SMTP_HOST");
  if (!host) return null;
  const port = Number(optional("SMTP_PORT") ?? 587);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a port number, like 2525");
  }
  return {
    host,
    port,
    user: optional("SMTP_USER"),
    pass: optional("SMTP_PASS"),
    from: required("MAIL_FROM"),
    appUrl,
  };
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
  const appUrl = readAppUrl(isProduction);
  const trustProxy = Number(optional("TRUST_PROXY") ?? (isProduction ? 1 : 0));
  if (!Number.isInteger(trustProxy) || trustProxy < 0) {
    throw new Error("TRUST_PROXY must be 0, 1, 2, …");
  }

  return {
    port: Number(process.env.PORT ?? 4000),
    databaseUrl: required("DATABASE_URL"),
    sessionSecret,
    isProduction,
    // HTTPS-only cookies. On by default in production; set COOKIE_SECURE=false to test
    // the production Docker image on http://localhost.
    secureCookie:
      (process.env.COOKIE_SECURE ?? String(isProduction)) === "true",
    // How many proxies sit in front of the API (Render: 1; Netlify then Render: 2),
    // so rate limits see each visitor's real IP address
    trustProxy,
    smtp: readSmtp(appUrl),
    webAuthn: readWebAuthn({
      appUrl,
      rpId: optional("WEBAUTHN_RP_ID"),
      origin: optional("WEBAUTHN_ORIGIN"),
    }),
    // Only set in production (the Docker image sets it)
    webDistDir: optional("WEB_DIST_DIR"),
  };
}
