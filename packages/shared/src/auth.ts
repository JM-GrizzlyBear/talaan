import { z } from "zod";

export const AUTH_LIMITS = {
  nameMax: 50,
  emailMax: 255,
  passwordMin: 10,
  passwordMax: 72, // bcrypt only uses the first 72 bytes
} as const;

// A 6-digit code sent by email, for Forgot password and for two-step sign-in
export const EMAIL_CODE = {
  length: 6,
  minutes: 15,
  maxTries: 3,
} as const;
export const RESET_CODE = EMAIL_CODE;

// Two-step sign-in: a browser can be remembered so it isn't asked every time
export const TRUSTED_BROWSER_DAYS = 30;

// How long the website waits, with nobody using it, before it locks
export const LOCK_AFTER_MINUTES = [5, 15, 30, 60] as const;
export type LockAfterMinutes = (typeof LOCK_AFTER_MINUTES)[number];
export const DEFAULT_LOCK_AFTER_MINUTES: LockAfterMinutes = 15;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(AUTH_LIMITS.emailMax, `At most ${AUTH_LIMITS.emailMax} characters`)
  .email("Enter an email address like juan@example.com");

const newPassword = z
  .string()
  .min(
    AUTH_LIMITS.passwordMin,
    `At least ${AUTH_LIMITS.passwordMin} characters`,
  )
  .max(
    AUTH_LIMITS.passwordMax,
    `At most ${AUTH_LIMITS.passwordMax} characters`,
  );

const currentPassword = z
  .string()
  .min(1, "Enter your password")
  .max(AUTH_LIMITS.passwordMax);

const namePart = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${label}`)
    .max(AUTH_LIMITS.nameMax, `At most ${AUTH_LIMITS.nameMax} characters`);

export const registerSchema = z.object({
  firstName: namePart("first name"),
  // Optional: not everyone has one. Empty means none.
  middleName: z
    .string()
    .trim()
    .max(AUTH_LIMITS.nameMax, `At most ${AUTH_LIMITS.nameMax} characters`)
    .default(""),
  lastName: namePart("last name"),
  email,
  password: newPassword,
  // The Data Privacy Act asks for clear consent before keeping health records
  consent: z.literal(true, {
    error: "Tick the box to agree before Talaan keeps health records",
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your email"),
  password: currentPassword,
});

export const passwordResetRequestSchema = z.object({ email });

export const passwordResetCodeSchema = z.object({
  email,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6 digits from the email"),
});

export const passwordResetCompleteSchema = passwordResetCodeSchema.extend({
  password: newPassword,
});

export const unlockSchema = z.object({ password: currentPassword });

export const changePasswordSchema = z.object({
  currentPassword,
  newPassword,
});

export const securitySettingsSchema = z
  .object({
    lockAfterMinutes: z
      .union(
        LOCK_AFTER_MINUTES.map((minutes) => z.literal(minutes)),
        { error: `Choose ${LOCK_AFTER_MINUTES.join(", ")} minutes` },
      )
      .optional(),
    twoStepEnabled: z.boolean().optional(),
    // Needed only to turn two-step sign-in off
    currentPassword: currentPassword.optional(),
  })
  .refine(
    (settings) =>
      settings.lockAfterMinutes !== undefined ||
      settings.twoStepEnabled !== undefined,
    { error: "Nothing to change" },
  );

// Two-step sign-in: the code from the email, and whether to remember this browser
export const signInCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6 digits from the email"),
  rememberBrowser: z.boolean().default(true),
});

export const PASSKEY_NAME_MAX = 60;

// The name someone gives a passkey, like "Maria's iPhone"
export const passkeyNameSchema = z
  .string()
  .trim()
  .min(1, "Give the passkey a name")
  .max(PASSKEY_NAME_MAX, `At most ${PASSKEY_NAME_MAX} characters`);

// The browser's answer to a passkey prompt. Checked properly by the server's
// passkey library; here only its rough shape.
export const passkeyResponseSchema = z.looseObject({
  id: z.string().min(1).max(1024),
  rawId: z.string().min(1).max(1024),
  type: z.literal("public-key"),
  response: z.looseObject({}),
});

export const addPasskeySchema = z.object({
  name: passkeyNameSchema,
  response: passkeyResponseSchema,
});

export const passkeySignInSchema = z.object({
  response: passkeyResponseSchema,
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type PasswordResetRequestInput = z.input<
  typeof passwordResetRequestSchema
>;
export type PasswordResetCodeInput = z.input<typeof passwordResetCodeSchema>;
export type PasswordResetCompleteInput = z.input<
  typeof passwordResetCompleteSchema
>;
export type UnlockInput = z.input<typeof unlockSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type SecuritySettingsInput = z.input<typeof securitySettingsSchema>;
export type SignInCodeInput = z.input<typeof signInCodeSchema>;

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
  createdAt: string;
}

// POST /api/auth/login: signed in, or (two-step) a code was emailed first
export type LoginResult =
  { twoStep: false; user: PublicUser } | { twoStep: true; email: string };

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
}

// The same answer whether or not the email has an account
export const RESET_REQUESTED_MESSAGE =
  "If that email has a Talaan account, we sent a 6-digit code to it.";

export const SIGN_IN_CODE_SENT_MESSAGE =
  "We sent a 6-digit code to your email. Enter it to finish signing in.";

// "m•••a@example.com": enough to recognise the address, not enough to read it off a screen
export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const shown =
    name.length <= 2 ? name[0] : `${name[0]}•••${name[name.length - 1]}`;
  return `${shown}@${domain}`;
}

// "Juan Santos dela Cruz", or "Juan dela Cruz" without a middle name
export function fullName(person: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}
