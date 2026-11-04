import { z } from "zod";

export const AUTH_LIMITS = {
  nameMax: 80,
  emailMax: 255,
  passwordMin: 10,
  passwordMax: 72, // bcrypt only uses the first 72 bytes
} as const;

// Forgot password: a 6-digit code sent by email
export const RESET_CODE = {
  length: 6,
  minutes: 15,
  maxTries: 5,
} as const;

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

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(AUTH_LIMITS.nameMax, `At most ${AUTH_LIMITS.nameMax} characters`),
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

export const securitySettingsSchema = z.object({
  lockAfterMinutes: z.union(
    LOCK_AFTER_MINUTES.map((minutes) => z.literal(minutes)),
    { error: `Choose ${LOCK_AFTER_MINUTES.join(", ")} minutes` },
  ),
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

// What the API sends back about the signed-in user (never the password hash)
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  lockAfterMinutes: LockAfterMinutes;
  createdAt: string;
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
