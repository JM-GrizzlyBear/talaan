import type { NoteContent } from "../../domain/note/Note.js";
import type { NoteRepository } from "../../domain/note/NoteRepository.js";
import { NoteNotFoundError } from "../../domain/note/errors.js";

export class UpdateNote {
  constructor(private readonly notes: NoteRepository) {}

  async execute(id: string, userId: string, content: NoteContent) {
    const note = await this.notes.update(id, userId, content);
    if (!note) throw new NoteNotFoundError();
    return note;
  }
}
