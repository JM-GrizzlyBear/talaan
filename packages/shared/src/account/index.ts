import { z } from "zod";

// How long a suspended account is kept before it's deleted for good
export const ACCOUNT_KEEP_DAYS = 365;

// Deleting your account: suspend (deleted after a year unless you sign in),
// or everything right away (type DELETE)
export const deleteAccountSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("suspend"),
    password: z.string().min(1, { error: "Enter your password" }),
  }),
  z.object({
    mode: z.literal("now"),
    password: z.string().min(1, { error: "Enter your password" }),
    confirm: z.literal("DELETE", { error: "Type DELETE to confirm" }),
  }),
]);
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
