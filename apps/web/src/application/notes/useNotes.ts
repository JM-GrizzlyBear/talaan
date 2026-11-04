import type { NoteInput } from "@pern/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createNote,
  deleteNote,
  fetchNotes,
  updateNote,
} from "../../infrastructure/api/notesApi";

const NOTES_KEY = ["notes"] as const;

export function useNotes() {
  return useQuery({
    queryKey: NOTES_KEY,
    queryFn: async () => await fetchNotes(),
  });
}

// After any change, fetch the list again so it matches the server
function useRefreshNotes() {
  const queryClient = useQueryClient();
  return async () =>
    await queryClient.invalidateQueries({ queryKey: NOTES_KEY });
}

export function useCreateNote() {
  const refresh = useRefreshNotes();
  return useMutation({
    mutationFn: async (input: NoteInput) => await createNote(input),
    onSuccess: refresh,
  });
}

export function useUpdateNote() {
  const refresh = useRefreshNotes();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: NoteInput }) =>
      await updateNote(id, input),
    onSuccess: refresh,
  });
}

export function useDeleteNote() {
  const refresh = useRefreshNotes();
  return useMutation({
    mutationFn: async (id: string) => await deleteNote(id),
    onSuccess: refresh,
  });
}
