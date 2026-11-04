import type { Note, NoteContent } from "./Note.js";

// Every method takes the owner's id: a note can only be read or changed by its owner
export interface NoteRepository {
  // Most recently changed first
  listByOwner(userId: string): Promise<Note[]>;
  findOwned(id: string, userId: string): Promise<Note | null>;
  create(userId: string, content: NoteContent): Promise<Note>;
  // null when the note doesn't exist or belongs to someone else
  update(
    id: string,
    userId: string,
    content: NoteContent,
  ): Promise<Note | null>;
  // false when the note doesn't exist or belongs to someone else
  delete(id: string, userId: string): Promise<boolean>;
}
