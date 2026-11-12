import type { RecordType } from "../../records/constants.js";
import type { ReadLabRow, TextLine } from "../types.js";
import { clean, lineDoubts, titleCase } from "./lines.js";
import { DETAIL_DOUBTS, type ReadField } from "./types.js";

// What kind of paper it is, and a title for it. First match wins.
const KINDS: {
  type: RecordType;
  test: RegExp;
  title?: (m: RegExpExecArray) => string;
}[] = [
  {
    type: "billing",
    test: /\b(statement of account|soa|official receipt|billing statement|hospital bill|final bill|charge slip|letter of authori[sz]ation|loa no|total amount due|amount due)\b/i,
  },
  {
    type: "certificate",
    test: /\b(medical certificate|fit to work|fit-to-work|this is to certify|certificate of)\b/i,
  },
  {
    type: "vaccination",
    test: /\b(vaccin(e|ation)|immuni[sz]ation|bakuna|booster dose)\b/i,
  },
  {
    type: "imaging",
    test: /\b(x-?ray|xray|radiograph(y|ic)?|ultrasound|ultrasonograph|utz|sonograph|ct scan|cat scan|computed tomography|mri|magnetic resonance|mammogra(m|phy)|2d echo|echocardiogra(m|phy)|ultrasound report|radiology report|roentgenologic)\b/i,
  },
  {
    type: "prescription",
    test: /(^|\s)(rx|r\/x|℞)(\s|:|$)|\b(prescription|reseta|sig\.?:|dispense)\b/i,
  },
  {
    type: "lab",
    test: /\b(laboratory (result|report)|complete blood count|cbc|hematology|urinalysis|fecalysis|blood chemistry|clinical chemistry|lipid (profile|panel)|fasting blood sugar|fbs|hba1c|serology|thyroid (panel|function)|culture and sensitivity)\b/i,
  },
  {
    type: "consultation",
    test: /\b(consultation|check-?up|chief complaint|history of present illness|assessment|diagnosis|impression and plan)\b/i,
  },
];

// Common names to use as the title
const LAB_TITLES: [RegExp, string][] = [
  [/\b(complete blood count|cbc)\b/i, "CBC"],
  [/\burinalysis\b/i, "Urinalysis"],
  [/\bfecalysis\b/i, "Fecalysis"],
  [/\blipid (profile|panel)\b/i, "Lipid profile"],
  [/\b(fasting blood sugar|fbs)\b/i, "FBS"],
  [/\bhba1c\b/i, "HbA1c"],
  [/\b(blood|clinical) chemistry\b/i, "Blood chemistry"],
  [/\bthyroid\b/i, "Thyroid panel"],
];
const IMAGING_KIND: [RegExp, string][] = [
  [/\b(x-?ray|xray|radiograph|roentgenologic)/i, "X-ray"],
  [/\b(ultrasound|ultrasonograph|utz|sonograph)/i, "Ultrasound"],
  [/\b(ct scan|cat scan|computed tomography)\b/i, "CT scan"],
  [/\b(mri|magnetic resonance)\b/i, "MRI"],
  [/\bmammogra/i, "Mammogram"],
  [/\b(2d echo|echocardiogra)/i, "2D echo"],
];
// Tests that mean a blood count
const CBC_TESTS =
  /^(hemoglobin|hematocrit|wbc|rbc|platelet|white blood|red blood)/i;

export function guessKind(
  lines: TextLine[],
  labRows: ReadLabRow[],
  bodyPart: string | null,
): { type: ReadField & { value: RecordType }; title: ReadField } | null {
  const all = lines.map((l) => l.text).join("\n");
  let found = KINDS.find((k) => k.test.test(all));
  // Several lab results and nothing else: a lab result
  if ((!found || found.type === "consultation") && labRows.length >= 2) {
    found = KINDS.find((k) => k.type === "lab");
  }
  if (!found) return null;
  const line = lines.find((l) => found.test.test(l.text));
  const from = line ?? lines[0] ?? { text: "", confidence: null };
  const doubts = line ? lineDoubts(line) : [DETAIL_DOUBTS.guessed];
  const type = { value: found.type, doubts, line: from.text };

  let title: string;
  switch (found.type) {
    case "lab": {
      const names = LAB_TITLES.filter(([re]) => re.test(all)).map(([, t]) => t);
      if (names.length === 0 && labRows.some((r) => CBC_TESTS.test(r.name)))
        names.push("CBC");
      title = names.slice(0, 2).join(" and ") || "Lab result";
      break;
    }
    case "imaging": {
      const kind = IMAGING_KIND.find(([re]) => re.test(all))?.[1] ?? "Imaging";
      const part = bodyPart?.split(/[\s/,]/)[0];
      title =
        part && kind === "X-ray"
          ? `${titleCase(part)} X-ray`
          : part
            ? `${kind}, ${titleCase(part)}`
            : kind;
      break;
    }
    case "billing":
      title = /statement of account|\bsoa\b/i.test(all)
        ? "Statement of account"
        : /official receipt/i.test(all)
          ? "Official receipt"
          : /letter of authori/i.test(all)
            ? "LOA"
            : "Hospital bill";
      break;
    case "certificate":
      title = /fit[- ]to[- ]work/i.test(all)
        ? "Fit-to-work certificate"
        : "Medical certificate";
      break;
    case "vaccination":
      title = "Vaccination";
      break;
    case "prescription":
      title = "Prescription";
      break;
    default:
      title = "Consultation";
  }
  return {
    type,
    title: {
      value: clean(title),
      doubts: [DETAIL_DOUBTS.guessed],
      line: from.text,
    },
  };
}
