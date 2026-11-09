import type { ShareSettings } from "@talaan/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createShare,
  fetchShare,
  fetchShared,
  fetchShares,
  type NewShareInput,
  openShared,
  removeShare,
  stopShare,
  updateShare,
} from "../../infrastructure/api/sharesApi";

const SHARES = ["shares"] as const;

export function useShares(ownerId: string | undefined) {
  return useQuery({
    queryKey: [...SHARES, "list", ownerId],
    queryFn: async () => await fetchShares(ownerId ?? ""),
    enabled: Boolean(ownerId),
  });
}

export function useShare(id: string) {
  return useQuery({
    queryKey: [...SHARES, "one", id],
    queryFn: async () => await fetchShare(id),
  });
}

// Every change refreshes the lists, the link and the history
function useRefresh() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: SHARES });
    await queryClient.invalidateQueries({ queryKey: ["activity"] });
  };
}

export function useCreateShare() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: NewShareInput) => await createShare(input),
    onSuccess: refresh,
  });
}

export function useUpdateShare(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (settings: ShareSettings) =>
      await updateShare(id, settings),
    onSuccess: refresh,
  });
}

export function useStopShare(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async () => await stopShare(id),
    onSuccess: refresh,
  });
}

export function useRemoveShare() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: string) => await removeShare(id),
    onSuccess: refresh,
  });
}

// The doctor's page: the page itself, or the PIN step first
export function useShared(token: string) {
  return useQuery({
    queryKey: ["shared", token],
    queryFn: async () => await fetchShared(token),
    retry: false,
  });
}

export function useOpenShared(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pin: string) => await openShared(token, pin),
    onSuccess: (page) => queryClient.setQueryData(["shared", token], { page }),
  });
}
