import type { NoteRepository } from "../../domain/note/NoteRepository.js";
import { NoteNotFoundError } from "../../domain/note/errors.js";

export class DeleteNote {
  constructor(private readonly notes: NoteRepository) {}

  async execute(id: string, userId: string) {
    if (!(await this.notes.delete(id, userId))) throw new NoteNotFoundError();
  }
}
