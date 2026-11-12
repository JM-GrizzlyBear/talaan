import type { TextLine } from "../types.js";
import {
  afterLabel,
  clean,
  hardToRead,
  lineDoubts,
  titleCase,
} from "./lines.js";
import { DETAIL_DOUBTS, type ReadField, type ReadMedicine } from "./types.js";

const field = (
  value: string,
  line: TextLine,
  more: string[] = [],
): ReadField => ({
  value,
  doubts: [...lineDoubts(line), ...more],
  line: line.text,
});

// X-ray and imaging: what was imaged, and the reading (impression first)
const PART_LABEL =
  /\b(exam(ination)?|procedure|study|part|region|view)\s*(done|requested)?\s*[:\-]/i;
const HEADINGS =
  /^(findings?|impressions?|conclusions?|remarks?|interpretation|diagnosis)\s*[:\-]?\s*/i;
const END =
  /^(radiologist|sonologist|signed|electronically|thank you|dictated|transcribed|verified|[A-Z][A-Za-z.' ]+,\s*m\.?d\.?)/i;

export function findBodyPart(lines: TextLine[]) {
  for (const line of lines) {
    // "Date of Exam: …" is the date, not the body part
    if (/\bdate\b/i.test(line.text)) continue;
    const after = afterLabel(line.text, PART_LABEL);
    if (after && after.length >= 3 && after.length <= 60) {
      return field(titleCase(after), line);
    }
  }
  for (const line of lines) {
    const m =
      /\b(chest|abdomen|whole abdomen|pelvis|kub|skull|spine|knee|hand|foot|ankle|shoulder|hip|breast|thyroid|neck|lumbar|cervical)\b(\s+(pa|ap|lateral|apl|pa\/lat|pa and lateral|view))?/i.exec(
        line.text,
      );
    if (m && /x-?ray|ultrasound|utz|ct|mri|exam|radiograph/i.test(line.text)) {
      return field(titleCase(m[0].toUpperCase()), line, [
        DETAIL_DOUBTS.guessed,
      ]);
    }
  }
  return null;
}

export function findReading(lines: TextLine[], max = 2000): ReadField | null {
  const sections = new Map<string, { text: string[]; lines: TextLine[] }>();
  let current: string | null = null;
  for (const line of lines) {
    const text = clean(line.text);
    const heading = HEADINGS.exec(text);
    if (heading) {
      current = heading[1].toLowerCase().replace(/s$/, "");
      const rest = text.slice(heading[0].length);
      sections.set(current, { text: rest ? [rest] : [], lines: [line] });
      continue;
    }
    if (!current) continue;
    if (END.test(text)) {
      current = null;
      continue;
    }
    const section = sections.get(current)!;
    section.text.push(text);
    section.lines.push(line);
  }
  const pick =
    sections.get("impression") ??
    sections.get("conclusion") ??
    sections.get("finding");
  if (!pick || pick.text.join("").length < 3) return null;
  let value = pick.text.join("\n").trim();
  const doubts: string[] = [];
  if (pick.lines.some(hardToRead)) doubts.push(DETAIL_DOUBTS.handwritten);
  if (value.length > max) {
    value = `${value.slice(0, max)}…`;
    doubts.push(DETAIL_DOUBTS.shortened);
  }
  return { value, doubts, line: pick.lines[0].text };
}

// Vaccination: the vaccine and the dose
const VACCINES =
  /\b(flu|influenza|pneumo(coccal|vax)?|pcv\s?\d+|ppsv\s?23|hep(atitis)?\s?[ab]|hpv|gardasil|mmr|varicella|chicken ?pox|tetanus|tdap|dtap|td|bcg|polio|ipv|opv|rotavirus|typhoid|rabies|anti-?rabies|dengvaxia|covid(-?19)?|pfizer|moderna|sinovac|astrazeneca|janssen|comirnaty|shingrix|zoster|measles|japanese encephalitis)\b[\w\s-]{0,20}/i;
export function findVaccine(lines: TextLine[]) {
  for (const line of lines) {
    const after = afterLabel(
      line.text,
      /\b(vaccine|bakuna|brand)\s*(name|given)?\s*[:\-]/i,
    );
    if (after) return field(titleCase(after), line);
  }
  for (const line of lines) {
    const m = VACCINES.exec(line.text);
    if (m) return field(titleCase(clean(m[0])), line, [DETAIL_DOUBTS.guessed]);
  }
  return null;
}
export function findDose(lines: TextLine[]) {
  for (const line of lines) {
    const m =
      /\b((1st|2nd|3rd|[4-9]th|first|second|third)\s+dose|dose\s*(no\.?\s*)?\d|booster(\s+dose)?)\b/i.exec(
        line.text,
      );
    if (m) {
      const n = /\d/.exec(m[0])?.[0];
      const text = /booster/i.test(m[0])
        ? "Booster"
        : n && /dose\s*(no\.?\s*)?\d/i.test(m[0])
          ? `Dose ${n}`
          : titleCase(m[0].toUpperCase()).replace(/^(\w)/, (c) =>
              c.toUpperCase(),
            );
      return field(text, line);
    }
  }
  return null;
}

// HMO and billing
const HMOS =
  /\b(maxicare|intellicare|medicard|philcare|cocolife|pacific cross|valucare|value care|avega|etiqa|kaiser|caritas health ?shield|icare|insular health ?care|axa|generali|amaphil|asianlife|lifehealth|carehealth plus|hmi|eastwest healthcare|medasia|dynamic care|philhealth)\b/i;

export function findHmo(lines: TextLine[]) {
  for (const line of lines) {
    const after = afterLabel(
      line.text,
      /\b(hmo|health plan|insurance|provider)\s*(name)?\s*[:\-]/i,
    );
    if (after && after.length >= 3 && !/\d{4,}/.test(after))
      return field(titleCase(after), line);
  }
  for (const line of lines) {
    const m = HMOS.exec(line.text);
    if (m) return field(titleCase(m[0].toUpperCase()), line);
  }
  return null;
}

export function findLoa(lines: TextLine[]) {
  for (const line of lines) {
    const m =
      /\b(loa|approval|authori[sz]ation|reference|ref\.?)\s*(no\.?|number|code|#)?\s*[:#\-]?\s*([A-Z0-9][A-Z0-9\-]{3,})/i.exec(
        line.text,
      );
    if (m && /\d/.test(m[3])) return field(m[3].toUpperCase(), line);
  }
  return null;
}

// "₱12,345.50", "PHP 1,234", "P 980.00" → "12345.50"
export function amountIn(text: string) {
  const m = /(?:₱|php|p)?\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?(?!\d)/i.exec(
    text.replace(/(\d)\s+(?=\d{3}\b)/g, "$1,"),
  );
  if (!m) return null;
  const value = Number(`${m[1].replace(/,/g, "")}${m[2] ?? ""}`);
  return Number.isFinite(value) && value > 0 ? value.toFixed(2) : null;
}

const AMOUNTS: [keyof Amounts, RegExp][] = [
  [
    "youPaid",
    /\b(amount due|balance due|patient('?s)? (share|portion|due)|you pay|amount paid|cash paid|net amount|due from patient|total due)\b/i,
  ],
  [
    "hmoCovered",
    /\b(hmo (share|portion|coverage|covered)|less:?\s*hmo|covered by|approved amount|charged to hmo|company share)\b/i,
  ],
  [
    "totalAmount",
    /\b(total (hospital )?(bill|charges|amount)|grand total|gross (amount|total)|total)\b/i,
  ],
];
interface Amounts {
  totalAmount: ReadField | null;
  hmoCovered: ReadField | null;
  youPaid: ReadField | null;
}
export function findAmounts(lines: TextLine[]): Amounts {
  const found: Amounts = { totalAmount: null, hmoCovered: null, youPaid: null };
  for (const line of lines) {
    for (const [key, label] of AMOUNTS) {
      if (found[key] || !label.test(line.text)) continue;
      const after = line.text.slice((label.exec(line.text)?.index ?? 0) + 3);
      const amount = amountIn(after);
      if (amount) {
        found[key] = field(amount, line);
        break;
      }
    }
  }
  return found;
}

// Prescriptions: "Losartan 50mg tab #30" then "Sig: 1 tab once a day"
const STRENGTH =
  /(\d+(?:\.\d+)?\s?(?:mg|mcg|µg|g|ml|mL|iu|IU|units?|%)(?:\s?\/\s?\d*\s?(?:ml|mL|tab|5ml))?)/;
const FORM =
  /\b(tab(let)?s?|cap(sule)?s?|syrup|susp(ension)?|drops?|cream|ointment|inhaler|puffs?|amp(oule)?s?|vials?|sachets?|patch(es)?)\b/i;
const SIG = /^(sig\.?|signa|take|inumin|uminom|apply|use|instill)\b[:.\s]*/i;
const QTY = /\s*#\s*\d+.*$|\s+no\.?\s*\d+\s*$|\s*\(\s*\d+\s*\)\s*$/i;
const FREQ =
  /\b(once|twice|thrice|\d+\s?x|every|q\.?\s?\d+\s?h|od|bid|tid|qid|hs|prn|as needed|daily|a day|before|after|meals?|bedtime|morning|night|for \d+ days?|x \d+ days?)\b/i;

export function findMedicines(lines: TextLine[]): ReadMedicine[] {
  const medicines: ReadMedicine[] = [];
  let started = false;
  for (const line of lines) {
    let text = clean(line.text);
    if (/(^|\s)(rx|r\/x|℞)(\s|:|$)/i.test(text)) {
      started = true;
      text = text.replace(/^.*?(rx|r\/x|℞)[:.\s]*/i, "");
      if (!text) continue;
    }
    if (
      /^(name|age|sex|address|date|patient|lic|ptr|s2|signature)\b/i.test(text)
    )
      continue;
    const sig = SIG.exec(text);
    const last = medicines.at(-1);
    if (sig && last && !last.frequency) {
      last.frequency = clean(text.slice(sig[0].length));
      if (hardToRead(line)) last.doubts.push(DETAIL_DOUBTS.handwritten);
      continue;
    }
    const strength = STRENGTH.exec(text);
    if (!strength || (!started && !FORM.test(text))) continue;
    const before = clean(
      text.slice(0, strength.index).replace(/^\d+[.)]\s*/, ""),
    );
    if (!/[a-z]{3,}/i.test(before)) continue;
    const after = text
      .slice(strength.index + strength[0].length)
      .replace(QTY, "");
    const frequency = FREQ.test(after)
      ? clean(after.replace(FORM, "").replace(/^[\s,-]+/, ""))
      : "";
    medicines.push({
      name: titleCase(before.replace(/\(.*?\)/g, "").trim()).replace(
        /\s+/g,
        " ",
      ),
      dose: strength[1]
        .replace(/\s+/g, " ")
        .replace(/(\d)(mg|mcg|g|ml|iu)/i, "$1 $2"),
      frequency,
      doubts: hardToRead(line) ? [DETAIL_DOUBTS.handwritten] : [],
      line: line.text,
    });
  }
  return medicines;
}
