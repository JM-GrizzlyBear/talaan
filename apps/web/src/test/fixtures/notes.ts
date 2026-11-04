import type { Note } from "@pern/shared";

// A note as the API sends it; tests change only what they need
export function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "A note",
    body: "",
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
    ...overrides,
  };
}
