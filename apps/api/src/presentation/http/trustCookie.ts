import type { Request, Response } from "express";

// Remembers a browser that passed two-step sign-in. httpOnly: the page's
// JavaScript can't read it. Only sent to /api.
export const TRUST_COOKIE = "talaan.tb";
const PATH = "/api";

export function readCookie(req: Request, name: string) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function readTrustCookie(req: Request) {
  return readCookie(req, TRUST_COOKIE);
}

export function setTrustCookie(
  res: Response,
  value: string,
  expiresAt: Date,
  secure: boolean,
) {
  res.cookie(TRUST_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: PATH,
    expires: expiresAt,
  });
}

export function clearTrustCookie(res: Response) {
  res.clearCookie(TRUST_COOKIE, { path: PATH });
}
