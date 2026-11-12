import type { TextLine } from "../types.js";
import { afterLabel, clean, lineDoubts, titleCase } from "./lines.js";
import { DETAIL_DOUBTS, type ReadField } from "./types.js";

// Words in a hospital's, clinic's or lab's name
const PLACE =
  /\b(hospital|medical (center|centre|city|clinic|plaza|arts)|med(ical)?\.? ctr|clinic|clinica|klinika|polyclinic|diagnostic(s)?|laborator(y|ies)|imaging|health ?(care|center|centre|way|plus)?|wellness|infirmary|sanitarium|ospital|pagamutan|healthway|hi-?precision|st\.? luke'?s|makati med|asian hospital|cardinal santos|the medical city|chong hua|perpetual succour|vicente sotto|philippine general|pgh|unilab|aventus|maxicare pcc|watsons|mercury drug|southstar|rose pharmacy|generika|pharmacy|botika|drugstore)\b/i;
const LABEL =
  /\b(hospital|clinic|facility|laboratory|institution|issued at|place)\s*(name)?\s*[:\-]/i;
// Lines that mention a place but aren't its name
const NOT_IT =
  /\b(address|tel|phone|fax|email|website|www\.|\.com|\.ph|street|st\.\s*\d|brgy|barangay|city of|province|zip|patient|name\s*:|requesting|physician)\b/i;

// The hospital, clinic or lab: usually in the first lines (the letterhead)
export function findFacility(lines: TextLine[]): ReadField | null {
  for (const line of lines) {
    const labelled = afterLabel(line.text, LABEL);
    if (labelled && labelled.length >= 3) {
      return {
        value: titleCase(labelled),
        doubts: lineDoubts(line),
        line: line.text,
      };
    }
  }
  const top = lines.slice(0, 12);
  for (const line of top) {
    const text = clean(line.text);
    if (!PLACE.test(text) || NOT_IT.test(text) || text.length > 70) continue;
    if (/\d{3,}/.test(text)) continue;
    const doubts = lineDoubts(line);
    doubts.push(DETAIL_DOUBTS.guessed);
    return {
      value: titleCase(text.replace(/[,.;:]+$/, "")),
      doubts,
      line: line.text,
    };
  }
  return null;
}
