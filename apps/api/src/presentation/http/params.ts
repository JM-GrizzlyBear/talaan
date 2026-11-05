import { z } from "zod";
import { NotFoundError } from "../../domain/errors.js";

// An id in the address must be a uuid, or there's nothing to find
export function idParam(value: unknown) {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}
