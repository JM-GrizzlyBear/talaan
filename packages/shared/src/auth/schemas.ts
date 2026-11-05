import { z } from "zod";
import {
  AUTH_LIMITS,
  LOCK_AFTER_MINUTES,
  PASSKEY_NAME_MAX,
} from "./constants.js";

export const emailSchema = z
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

// A first or last name (shared with family profiles)
export const namePart = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${label}`)
    .max(AUTH_LIMITS.nameMax, `At most ${AUTH_LIMITS.nameMax} characters`);

// Optional: not everyone has one. Empty means none.
export const middleNamePart = z
  .string()
  .trim()
  .max(AUTH_LIMITS.nameMax, `At most ${AUTH_LIMITS.nameMax} characters`)
  .default("");

export const registerSchema = z.object({
  firstName: namePart("first name"),
  middleName: middleNamePart,
  lastName: namePart("last name"),
  email: emailSchema,
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

export const passwordResetRequestSchema = z.object({ email: emailSchema });

export const passwordResetCodeSchema = z.object({
  email: emailSchema,
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
