import type {
  ChangePasswordInput,
  SecuritySettingsInput,
} from "@talaan/shared";
import { useMutation } from "@tanstack/react-query";
import {
  changePassword,
  updateSecuritySettings,
} from "../../infrastructure/api/accountApi";
import { useUpdateSession } from "./useAuth";

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) =>
      await changePassword(input),
  });
}

export function useUpdateSecuritySettings() {
  const update = useUpdateSession();
  return useMutation({
    mutationFn: async (input: SecuritySettingsInput) =>
      await updateSecuritySettings(input),
    onSuccess: (user) => update((session) => ({ ...session, user })),
  });
}
