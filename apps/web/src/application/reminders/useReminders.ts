import type { OccurrenceAction, ReminderFieldsInput } from "@talaan/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actOnOccurrence,
  createReminder,
  fetchAgenda,
  fetchReminder,
  fetchReminders,
  removeReminder,
  setMyAlerts,
  setReminderPaused,
  updateReminder,
} from "../../infrastructure/api/remindersApi";

export function useReminders(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["reminders", "list", ownerId],
    queryFn: async () => await fetchReminders(ownerId ?? ""),
    enabled: Boolean(ownerId),
  });
}

// Every time in [from, to); refreshed each minute so "now" moves along
export function useAgenda(ownerId: string | undefined, from: Date, to: Date) {
  return useQuery({
    queryKey: [
      "reminders",
      "agenda",
      ownerId,
      from.toISOString(),
      to.toISOString(),
    ],
    queryFn: async () => await fetchAgenda(ownerId ?? "", from, to),
    enabled: Boolean(ownerId),
    refetchInterval: 60 * 1000,
  });
}

export function useReminder(id: string) {
  return useQuery({
    queryKey: ["reminders", "one", id],
    queryFn: async () => await fetchReminder(id),
  });
}

function useRefresh() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["reminders"] }),
      queryClient.invalidateQueries({ queryKey: ["activity"] }),
    ]);
  };
}

export function useCreateReminder() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: {
      ownerId: string;
      fields: ReminderFieldsInput;
    }) => await createReminder(input.ownerId, input.fields),
    onSuccess: refresh,
  });
}

export function useUpdateReminder() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: { id: string; fields: ReminderFieldsInput }) =>
      await updateReminder(input.id, input.fields),
    onSuccess: refresh,
  });
}

export function useRemoveReminder() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: string) => await removeReminder(id),
    onSuccess: refresh,
  });
}

export function useSetPaused() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: { id: string; paused: boolean }) =>
      await setReminderPaused(input.id, input.paused),
    onSuccess: refresh,
  });
}

export function useOccurrenceAction() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: { id: string; action: OccurrenceAction }) =>
      await actOnOccurrence(input.id, input.action),
    onSuccess: refresh,
  });
}

export function useSetMyAlerts() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: { id: string; muted: boolean }) =>
      await setMyAlerts(input.id, input.muted),
    onSuccess: refresh,
  });
}
