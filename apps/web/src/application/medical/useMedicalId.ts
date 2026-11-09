import type { EmergencySettings, MedicalIdInput } from "@talaan/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmergency,
  fetchMedicalId,
  markMedicalIdChecked,
  type Person,
  saveEmergency,
  saveMedicalId,
} from "../../infrastructure/api/medicalApi";

const key = (person: Person) => [
  "medical-id",
  person.ownerId,
  person.profileId,
];

export function useMedicalId(person: Person | null) {
  return useQuery({
    queryKey: person ? key(person) : ["medical-id", "none"],
    queryFn: async () => await fetchMedicalId(person as Person),
    enabled: Boolean(person),
  });
}

export function useSaveMedicalId(person: Person) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fields: MedicalIdInput) =>
      await saveMedicalId(person, fields),
    onSuccess: async (saved) => {
      queryClient.setQueryData(key(person), saved);
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useMarkChecked(person: Person) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => await markMedicalIdChecked(person),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(person) }),
  });
}

export function useSaveEmergency(person: Person) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: EmergencySettings & { newCode?: boolean }) =>
      await saveEmergency(person, settings),
    onSuccess: (saved) => queryClient.setQueryData(key(person), saved),
  });
}

export function useEmergency(token: string) {
  return useQuery({
    queryKey: ["emergency", token],
    queryFn: async () => await fetchEmergency(token),
    retry: false,
  });
}
