import type {
  ChangePasswordInput,
  SecuritySettingsInput,
} from "@talaan/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addPasskey,
  changePassword,
  forgetAllBrowsers,
  forgetBrowser,
  listPasskeys,
  listTrustedBrowsers,
  removePasskey,
  signOutOtherDevices,
  updateSecuritySettings,
} from "../api/accountApi";
import { useUpdateSession } from "./useAuth";

const PASSKEYS_KEY = ["account", "passkeys"] as const;
const BROWSERS_KEY = ["account", "browsers"] as const;

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) =>
      await changePassword(input),
    // A new password forgets every remembered browser
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BROWSERS_KEY }),
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

export function usePasskeys() {
  return useQuery({
    queryKey: PASSKEYS_KEY,
    queryFn: async () => await listPasskeys(),
  });
}

// Keeps the passkey list and the count on the signed-in user (the lock screen uses it) in step
function useRefreshPasskeys() {
  const queryClient = useQueryClient();
  const update = useUpdateSession();
  return async () => {
    const passkeys = await queryClient.fetchQuery({
      queryKey: PASSKEYS_KEY,
      queryFn: async () => await listPasskeys(),
      staleTime: 0,
    });
    update((session) => ({
      ...session,
      user: { ...session.user, passkeyCount: passkeys.length },
    }));
  };
}

export function useAddPasskey() {
  const refresh = useRefreshPasskeys();
  return useMutation({
    mutationFn: async (name: string) => await addPasskey(name),
    onSuccess: refresh,
  });
}

export function useRemovePasskey() {
  const refresh = useRefreshPasskeys();
  return useMutation({
    mutationFn: async (id: string) => await removePasskey(id),
    onSettled: refresh,
  });
}

export function useTrustedBrowsers() {
  return useQuery({
    queryKey: BROWSERS_KEY,
    queryFn: async () => await listTrustedBrowsers(),
  });
}

export function useForgetBrowser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => await forgetBrowser(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: BROWSERS_KEY }),
  });
}

export function useForgetAllBrowsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => await forgetAllBrowsers(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: BROWSERS_KEY }),
  });
}

export function useSignOutOtherDevices() {
  return useMutation({ mutationFn: async () => await signOutOtherDevices() });
}
