import type { NoteRepository } from "../../domain/note/NoteRepository.js";

export class ListNotes {
  constructor(private readonly notes: NoteRepository) {}

  async execute(userId: string) {
    return await this.notes.listByOwner(userId);
  }
}
