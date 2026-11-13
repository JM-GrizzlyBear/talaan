import type {
  PasswordResetCodeInput,
  PasswordResetCompleteInput,
} from "@talaan/shared";
import { request } from "./http";

export async function requestResetCode(email: string) {
  return await request<{ message: string }>(
    "/api/auth/password-reset/request",
    "POST",
    { email },
  );
}

export async function checkResetCode(input: PasswordResetCodeInput) {
  await request<void>("/api/auth/password-reset/check", "POST", input);
}

export async function completePasswordReset(input: PasswordResetCompleteInput) {
  await request<void>("/api/auth/password-reset/complete", "POST", input);
}
