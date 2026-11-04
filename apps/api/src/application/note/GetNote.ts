import type { NoteRepository } from "../../domain/note/NoteRepository.js";
import { NoteNotFoundError } from "../../domain/note/errors.js";

export class GetNote {
  constructor(private readonly notes: NoteRepository) {}

  async execute(id: string, userId: string) {
    const note = await this.notes.findOwned(id, userId);
    if (!note) throw new NoteNotFoundError();
    return note;
  }
}
