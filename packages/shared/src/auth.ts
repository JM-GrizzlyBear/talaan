import { z } from "zod";

export const AUTH_LIMITS = {
  usernameMin: 3,
  usernameMax: 25,
  passwordMin: 8,
  passwordMax: 72, // bcrypt only uses the first 72 bytes
} as const;

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(
      AUTH_LIMITS.usernameMin,
      `At least ${AUTH_LIMITS.usernameMin} characters`,
    )
    .max(
      AUTH_LIMITS.usernameMax,
      `At most ${AUTH_LIMITS.usernameMax} characters`,
    )
    .regex(/^[a-z0-9_]+$/, "Only letters, numbers and _"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(
      AUTH_LIMITS.passwordMin,
      `At least ${AUTH_LIMITS.passwordMin} characters`,
    )
    .max(
      AUTH_LIMITS.passwordMax,
      `At most ${AUTH_LIMITS.passwordMax} characters`,
    ),
});

export const loginSchema = z.object({
  // A username or an email address
  login: z.string().trim().toLowerCase().min(1, "Required"),
  password: z.string().min(1, "Required").max(AUTH_LIMITS.passwordMax),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;

// What the API sends back about the logged-in user (never the password hash)
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}
