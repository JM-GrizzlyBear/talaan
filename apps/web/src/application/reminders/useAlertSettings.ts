import type { AlertSettings } from "@talaan/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addPushDevice,
  fetchAlertSettings,
  removePushDevice,
  saveAlertSettings,
  sendTestPush,
} from "@talaan/client";
import {
  browserLabel,
  currentEndpoint,
  subscribe,
  unsubscribe,
} from "../../infrastructure/push/browserPush";

const KEY = ["alert-settings"];

export function useAlertSettings() {
  return useQuery({ queryKey: KEY, queryFn: fetchAlertSettings });
}

// Whether this browser is signed up for notifications right now
export function useThisBrowser() {
  return useQuery({
    queryKey: [...KEY, "this-browser"],
    queryFn: async () => await currentEndpoint().catch(() => null),
  });
}

export function useSaveAlertSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: AlertSettings) =>
      await saveAlertSettings(settings),
    onSuccess: (data) => queryClient.setQueryData(KEY, data),
  });
}

// Ask the browser, then tell the API about it. false: the person said no.
export function useTurnOnThisBrowser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (publicKey: string) => {
      const subscription = await subscribe(publicKey);
      if (!subscription) return false;
      await addPushDevice({ ...subscription, label: browserLabel() });
      return true;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoveDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; isThisBrowser: boolean }) => {
      await removePushDevice(input.id);
      if (input.isThisBrowser) await unsubscribe();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSendTestPush() {
  return useMutation({ mutationFn: sendTestPush });
}
