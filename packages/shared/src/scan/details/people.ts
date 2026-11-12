import type { TextLine } from "../types.js";
import { afterLabel, clean, lineDoubts, titleCase } from "./lines.js";
import { DETAIL_DOUBTS, type ReadField } from "./types.js";

// Who asked for it or saw the patient: best first
const ASKED =
  /\b(requesting|referring|attending|ordering|requested by|referred by|attending)\s*(physician|doctor|md)?\b|\b(physician|doctor|doktor)\s*(in charge)?\b/i;
// The lab's or the radiologist's own doctor, signing the result
const LAB =
  /\b(pathologist|radiologist|sonologist|medical technologist|med\.?\s*tech|rmt|verified by|validated by|checked by)\b/i;

// After the name: credentials, licence numbers, signatures
const TAIL =
  /,?\s*(m\.?\s?d\.?|fp[a-z]{2,4}|dpb[a-z]*|fpcr|dpbr|faafp|mph|rmt|rn|prc|lic(ense|\.)?|ptr|s2|no\.?)\b.*$/i;

// "DR. JUAN DELA CRUZ, MD, FPCP  Lic. 012345" → "Dr. Juan Dela Cruz"
export function doctorName(text: string) {
  let name = clean(text)
    .replace(/^(dra?\.?|doctor|doktor)\s+/i, "")
    .replace(TAIL, "")
    .replace(/[,;:]+$/, "")
    .trim();
  // A name is a few words of letters
  if (!/^[A-Za-zÑñ.'\- ]{4,60}$/.test(name) || name.split(" ").length > 6) {
    return null;
  }
  name = titleCase(name);
  return `Dr. ${name}`;
}

export function findDoctor(lines: TextLine[]): ReadField | null {
  let lab: ReadField | null = null;
  for (const line of lines) {
    const text = line.text;
    const fromLabel = afterLabel(text, ASKED);
    const isLab = LAB.test(text);
    const candidates = [
      fromLabel,
      /\bdra?\.\s*[A-ZÑ][\w.'\- ]+/i.exec(text)?.[0],
      /[A-ZÑ][A-Za-zÑñ.'\- ]+,?\s*m\.?\s?d\.?\b/.exec(text)?.[0],
    ].filter(Boolean) as string[];
    for (const candidate of candidates) {
      const name = doctorName(candidate);
      if (!name) continue;
      const doubts = lineDoubts(line);
      if (!fromLabel) doubts.push(DETAIL_DOUBTS.guessed);
      if (isLab) {
        lab ??= {
          value: name,
          doubts: [...doubts, DETAIL_DOUBTS.labDoctor],
          line: text,
        };
        break;
      }
      return { value: name, doubts, line: text };
    }
  }
  return lab;
}
