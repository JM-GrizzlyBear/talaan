import type { Note, NoteInput } from "@pern/shared";
import { request } from "./http";

export async function fetchNotes() {
  const data = await request<{ notes: Note[] }>("/api/notes");
  return data.notes;
}

export async function createNote(input: NoteInput) {
  const data = await request<{ note: Note }>("/api/notes", "POST", input);
  return data.note;
}

export async function updateNote(id: string, input: NoteInput) {
  const data = await request<{ note: Note }>(
    `/api/notes/${encodeURIComponent(id)}`,
    "PUT",
    input,
  );
  return data.note;
}

export async function deleteNote(id: string) {
  await request<void>(`/api/notes/${encodeURIComponent(id)}`, "DELETE");
}
