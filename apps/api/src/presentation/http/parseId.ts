import { z } from "zod";
import { NoteNotFoundError } from "../../domain/note/errors.js";

const uuid = z.uuid();

// A note id from the URL. Anything that isn't a valid id simply doesn't exist (404).
export function parseNoteId(value: string | string[] | undefined) {
  const parsed = uuid.safeParse(value);
  if (!parsed.success) throw new NoteNotFoundError();
  return parsed.data;
}
