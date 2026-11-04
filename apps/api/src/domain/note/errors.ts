// Also used for someone else's note, so nobody learns which note ids exist
export class NoteNotFoundError extends Error {
  constructor() {
    super("That note doesn't exist");
    this.name = "NoteNotFoundError";
  }
}
