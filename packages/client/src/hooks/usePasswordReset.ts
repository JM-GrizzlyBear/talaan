import type {
  PasswordResetCodeInput,
  PasswordResetCompleteInput,
} from "@talaan/shared";
import { useMutation } from "@tanstack/react-query";
import {
  checkResetCode,
  completePasswordReset,
  requestResetCode,
} from "../api/passwordResetApi";

export function useRequestResetCode() {
  return useMutation({
    mutationFn: async (email: string) => await requestResetCode(email),
  });
}

export function useCheckResetCode() {
  return useMutation({
    mutationFn: async (input: PasswordResetCodeInput) =>
      await checkResetCode(input),
  });
}

export function useCompletePasswordReset() {
  return useMutation({
    mutationFn: async (input: PasswordResetCompleteInput) =>
      await completePasswordReset(input),
  });
}
