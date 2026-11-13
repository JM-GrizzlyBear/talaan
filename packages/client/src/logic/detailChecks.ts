import {
  DETAIL_DOUBTS,
  RECORD_TYPE_LABELS,
  type ReadDetails,
  type RecordType,
} from "@talaan/shared";
import {
  emptyLabRow,
  emptyMedicine,
  type LabRow,
  type MedicineRow,
  type RecordFormState,
} from "./recordFormState";

// The boxes a printout can fill
export const DETAIL_KEYS = [
  "type",
  "title",
  "recordDate",
  "doctor",
  "facility",
  "bodyPart",
  "reading",
  "vaccine",
  "dose",
  "hmo",
  "loaNumber",
  "totalAmount",
  "hmoCovered",
  "youPaid",
] as const;
export type DetailKey = (typeof DETAIL_KEYS)[number];

export const DETAIL_LABELS: Record<DetailKey, string> = {
  type: "Type",
  title: "Title",
  recordDate: "Date",
  doctor: "Doctor",
  facility: "Clinic or hospital",
  bodyPart: "Body part",
  reading: "Reading",
  vaccine: "Vaccine",
  dose: "Dose",
  hmo: "HMO",
  loaNumber: "LOA number",
  totalAmount: "Total bill (₱)",
  hmoCovered: "HMO covered (₱)",
  youPaid: "You paid (₱)",
};

// Which boxes each type has, beyond the usual ones
const TYPE_KEYS: Partial<Record<RecordType, DetailKey[]>> = {
  imaging: ["bodyPart", "reading"],
  vaccination: ["vaccine", "dose"],
  billing: ["hmo", "loaNumber", "totalAmount", "hmoCovered", "youPaid"],
};
const USUAL: DetailKey[] = [
  "type",
  "title",
  "recordDate",
  "doctor",
  "facility",
];

// A box read from the paper, while it's checked: editable, and used or not
export interface DetailCheck {
  key: DetailKey;
  value: string;
  doubts: string[];
  line: string;
  include: boolean;
  // What the form has now, when it's something else (asked, not replaced)
  current: string;
}

export interface MedicineCheck extends MedicineRow {
  include: boolean;
  doubts: string[];
  line: string;
}

const formValue = (form: RecordFormState, key: DetailKey) =>
  String(form[key] ?? "");

// What was read, ready to check. Empty boxes in the form are filled; a box
// that already has something else is left unticked so it isn't replaced
// without asking. (The date starts as today, so it counts as empty unless
// it was changed.)
export function toDetailChecks(
  details: ReadDetails,
  form: RecordFormState,
  today: string,
): DetailCheck[] {
  const checks: DetailCheck[] = [];
  for (const key of DETAIL_KEYS) {
    const read = details[key];
    if (!read || !read.value.trim()) continue;
    let current = formValue(form, key);
    if (key === "recordDate" && current === today) current = "";
    const same = current === read.value;
    checks.push({
      key,
      value: read.value,
      doubts: read.doubts,
      line: read.line,
      include: current === "" || same,
      current: same ? "" : current,
    });
  }
  return checks;
}

export function toMedicineChecks(details: ReadDetails): MedicineCheck[] {
  return details.medicines.map((m) => ({ ...m, include: true }));
}

// The boxes this type has that the paper didn't fill: left blank to do now
// or later
export function notFound(details: ReadDetails, type: RecordType | "") {
  const keys = [...USUAL, ...(type ? (TYPE_KEYS[type] ?? []) : [])];
  const missing = keys.filter((key) => !details[key]?.value.trim());
  if (type === "prescription" && details.medicines.length === 0) {
    missing.push("medicines" as DetailKey);
  }
  return missing.map((key) =>
    key === ("medicines" as DetailKey) ? "Medicines" : DETAIL_LABELS[key],
  );
}

export const needsCheck = (doubts: string[]) => doubts.length > 0;

const isEmptyRow = (row: object) =>
  Object.values(row).every((v) => String(v).trim() === "");

// Ticked boxes into the form. Rows are added after the ones already typed.
export function applyChecks(
  form: RecordFormState,
  checks: DetailCheck[],
  labRows: LabRow[],
  medicines: MedicineCheck[],
): RecordFormState {
  const next: RecordFormState = { ...form };
  for (const check of checks) {
    if (!check.include) continue;
    if (check.key === "type") {
      next.type = check.value as RecordType;
    } else {
      next[check.key] = check.value.trim();
    }
  }
  if (labRows.length > 0) {
    const kept = form.results.filter((row) => !isEmptyRow(row));
    next.results = [...kept, ...labRows];
  }
  const meds = medicines
    .filter((m) => m.include)
    .map(({ name, dose, frequency }) => ({ name, dose, frequency }));
  if (meds.length > 0) {
    const kept = form.medicines.filter((row) => !isEmptyRow(row));
    next.medicines = [...kept, ...meds];
  }
  if (next.results.length === 0) next.results = [emptyLabRow()];
  if (next.medicines.length === 0) next.medicines = [emptyMedicine()];
  return next;
}

// How a value reads on the check screen
export function shown(key: DetailKey, value: string) {
  return key === "type"
    ? (RECORD_TYPE_LABELS[value as RecordType] ?? value)
    : value;
}

// Every box with a doubt, counted for the "Please check" summary
export const doubtCount = (checks: DetailCheck[], meds: MedicineCheck[]) =>
  checks.filter((c) => c.include && needsCheck(c.doubts)).length +
  meds.filter((m) => m.include && needsCheck(m.doubts)).length;

export { DETAIL_DOUBTS };
