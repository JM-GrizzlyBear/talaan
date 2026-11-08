import { randomInt } from "node:crypto";
import { LABEL_ALPHABET, LABEL_CODE_LENGTH } from "@talaan/shared";

// A random label code: 30^8 ≈ 650 billion, so no one can guess one
export function randomLabelCode() {
  let code = "";
  for (let i = 0; i < LABEL_CODE_LENGTH; i++) {
    code += LABEL_ALPHABET[randomInt(LABEL_ALPHABET.length)];
  }
  return code;
}

export type MakeLabelCode = () => string;
