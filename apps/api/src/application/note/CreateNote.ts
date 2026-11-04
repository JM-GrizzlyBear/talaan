import type { NoteContent } from "../../domain/note/Note.js";
import type { NoteRepository } from "../../domain/note/NoteRepository.js";

export class CreateNote {
  constructor(private readonly notes: NoteRepository) {}

  async execute(userId: string, content: NoteContent) {
    return await this.notes.create(userId, content);
  }
}
