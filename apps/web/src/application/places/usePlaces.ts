import type { PlaceFieldsInput } from "@talaan/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBlankLabels,
  createPlace,
  fetchBlankLabels,
  fetchLabel,
  fetchPlace,
  fetchPlaces,
  nameLabel,
  removePlace,
  removePlacePhoto,
  updatePlace,
  uploadPlacePhoto,
} from "../../infrastructure/api/placesApi";

export function usePlaces(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["places", "list", ownerId],
    queryFn: async () => await fetchPlaces(ownerId ?? ""),
    enabled: Boolean(ownerId),
  });
}

export function usePlace(id: string) {
  return useQuery({
    queryKey: ["places", "one", id],
    queryFn: async () => await fetchPlace(id),
  });
}

// A change to a place shows in lists, other places, labels and records
function useRefresh() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all(
      ["places", "labels", "records"].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
  };
}

export function useCreatePlace() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: { ownerId: string; fields: PlaceFieldsInput }) =>
      await createPlace(input.ownerId, input.fields),
    onSuccess: refresh,
  });
}

export function useUpdatePlace() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: { id: string; fields: PlaceFieldsInput }) =>
      await updatePlace(input.id, input.fields),
    onSuccess: refresh,
  });
}

export function useRemovePlace() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: string) => await removePlace(id),
    onSuccess: refresh,
  });
}

export function useUploadPlacePhoto() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      file: File;
      onProgress: (fraction: number) => void;
    }) => await uploadPlacePhoto(input.id, input.file, input.onProgress),
    onSuccess: refresh,
  });
}

export function useRemovePlacePhoto() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: string) => await removePlacePhoto(id),
    onSuccess: refresh,
  });
}

// What a scanned label leads to
export function useLabel(code: string) {
  return useQuery({
    queryKey: ["labels", "one", code],
    queryFn: async () => await fetchLabel(code),
    retry: false,
  });
}

export function useNameLabel() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: { code: string; fields: PlaceFieldsInput }) =>
      await nameLabel(input.code, input.fields),
    onSuccess: refresh,
  });
}

export function useBlankLabels(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["labels", "blank", ownerId],
    queryFn: async () => await fetchBlankLabels(ownerId ?? ""),
    enabled: Boolean(ownerId),
  });
}

export function useCreateBlankLabels() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: { ownerId: string; count: number }) =>
      await createBlankLabels(input.ownerId, input.count),
    onSuccess: refresh,
  });
}
