import { normalizeLabelCode } from "@talaan/shared";
import { z } from "zod";
import { NotFoundError } from "../../domain/errors.js";

// An id in the address must be a uuid, or there's nothing to find
export function idParam(value: unknown) {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}

// A label code in the address ("7K4Q-M2XD" or "7k4qm2xd"), or nothing to find
export function labelCodeParam(value: unknown) {
  const code = typeof value === "string" ? normalizeLabelCode(value) : null;
  if (!code) throw new NotFoundError();
  return code;
}
