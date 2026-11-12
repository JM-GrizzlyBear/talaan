import { SURE_ENOUGH } from "../doubts.js";
import type { TextLine } from "../types.js";
import { DETAIL_DOUBTS } from "./types.js";

// A line, tidied: no doubled spaces, no stray bullets at the ends
export const clean = (text: string) =>
  text
    .replace(/[|¦]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s•·*\-–—:]+|[\s•·*\-–—]+$/g, "")
    .trim();

export const hardToRead = (line: TextLine) =>
  line.confidence !== null && line.confidence < SURE_ENOUGH;

// The doubts every field read from this line starts with
export const lineDoubts = (line: TextLine): string[] =>
  hardToRead(line) ? [DETAIL_DOUBTS.hardToRead] : [];

// "JUAN DELA CRUZ" → "Juan Dela Cruz"; leaves "St. Luke's", "MRI", "dela" as
// they are when already mixed case
export function titleCase(text: string) {
  if (/[a-z]/.test(text)) return text;
  return text
    .toLowerCase()
    .replace(
      /(^|[\s(/-])([a-zñ])/g,
      (_, before: string, letter: string) => before + letter.toUpperCase(),
    )
    .replace(/'S\b/g, "'s")
    .replace(/\b(Of|And|The|De|Del|Dela|Ng|Sa)\b/g, (w, _a, offset: number) =>
      offset === 0 ? w : w.toLowerCase(),
    )
    .replace(
      /\b(Ii|Iii|Iv|Md|Rn|Rmt|Ob|Gyn|Ent|Ct|Mri|Ecg|Hmo|Loa|Soa|Utz|Cbc|Fbs|Pa|Ap|Kub|Apl|Lat|Sm)\b/g,
      (w) => w.toUpperCase(),
    );
}

// The text after a label like "Physician:" or "Date Released -"
export function afterLabel(text: string, label: RegExp) {
  const match = label.exec(text);
  if (!match) return null;
  return clean(
    text.slice(match.index + match[0].length).replace(/^[\s:.\-–=]+/, ""),
  );
}
