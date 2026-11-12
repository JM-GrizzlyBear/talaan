import type { Appearance } from "../appearance/schema.js";
import type { LockAfterMinutes } from "./constants.js";

// What the API sends back about the signed-in user (never the password hash)
export interface PublicUser {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  lockAfterMinutes: LockAfterMinutes;
  // Asks for a code from email on browsers that aren't remembered
  twoStepEnabled: boolean;
  passkeyCount: number;
  // Colors, light or dark, text size (the same on every device)
  appearance: Appearance;
  createdAt: string;
}

// POST /api/auth/login: signed in, or (two-step) a code was emailed first
export type LoginResult =
  | { twoStep: false; user: PublicUser; welcomeBack?: boolean }
  | { twoStep: true; email: string };

// Signed in; welcomeBack: the account was suspended and is active again
export interface SignedIn {
  user: PublicUser;
  welcomeBack?: boolean;
}

export interface PasskeyInfo {
  id: string;
  name: string;
  // Synced passkeys (iCloud Keychain, Google Password Manager) work on every device of that account
  synced: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

// A browser that won't be asked for a code again until expiresAt
export interface TrustedBrowserInfo {
  id: string;
  label: string;
  // The browser this list is being looked at in
  current: boolean;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

// GET /api/auth/me. "locked": signed in, but the password is needed again
// because nobody used the website for a while.
export interface SessionInfo {
  user: PublicUser;
  locked: boolean;
  // Only on this browser, right after signing in brought the account back
  welcomeBack?: boolean;
}
