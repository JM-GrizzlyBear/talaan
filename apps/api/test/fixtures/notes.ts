import type { Note } from "../../src/domain/note/Note.js";
import { USERS } from "./users.js";

// Maria's note in the seed data
export const MARIAS_NOTE = {
  id: "00000000-0000-4000-8000-0000000000a1",
  userId: USERS.maria.id,
  title: "Groceries",
  body: "Milk, eggs",
  at: "2026-10-19T08:00:00Z",
} as const;

// A note for unit tests; tests change only what they need
export function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    userId: "u1",
    title: "A note",
    body: "",
    createdAt: new Date("2026-10-19T08:00:00Z"),
    updatedAt: new Date("2026-10-19T08:00:00Z"),
    ...overrides,
  };
}
