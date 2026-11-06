import type { RecordFieldsInput, RecordInfo, RecordType } from "@talaan/shared";

// What the form holds while someone types: every box as text
export interface LabRow {
  name: string;
  value: string;
  unit: string;
  rangeLow: string;
  rangeHigh: string;
}
export interface MedicineRow {
  name: string;
  dose: string;
  frequency: string;
}
export interface RecordFormState {
  type: RecordType | "";
  // "" for the account owner, or a profile id
  profileId: string;
  title: string;
  recordDate: string;
  doctor: string;
  facility: string;
  notes: string;
  bodyPart: string;
  reading: string;
  vaccine: string;
  dose: string;
  hmo: string;
  loaNumber: string;
  totalAmount: string;
  hmoCovered: string;
  youPaid: string;
  results: LabRow[];
  medicines: MedicineRow[];
}

export const emptyLabRow = (): LabRow => ({
  name: "",
  value: "",
  unit: "",
  rangeLow: "",
  rangeHigh: "",
});
export const emptyMedicine = (): MedicineRow => ({
  name: "",
  dose: "",
  frequency: "",
});

// Today in the person's own time zone, as YYYY-MM-DD
export function todayLocal(now = new Date()) {
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function emptyForm(profileId = ""): RecordFormState {
  return {
    type: "",
    profileId,
    title: "",
    recordDate: todayLocal(),
    doctor: "",
    facility: "",
    notes: "",
    bodyPart: "",
    reading: "",
    vaccine: "",
    dose: "",
    hmo: "",
    loaNumber: "",
    totalAmount: "",
    hmoCovered: "",
    youPaid: "",
    results: [emptyLabRow()],
    medicines: [emptyMedicine()],
  };
}

const text = (value: number | null) => (value === null ? "" : String(value));

export function formFromRecord(record: RecordInfo): RecordFormState {
  const form = {
    ...emptyForm(record.profileId ?? ""),
    ...{
      type: record.type,
      title: record.title,
      recordDate: record.recordDate,
      doctor: record.doctor,
      facility: record.facility,
      notes: record.notes,
    },
  };
  switch (record.type) {
    case "imaging":
      return { ...form, ...record.details };
    case "vaccination":
      return { ...form, ...record.details };
    case "billing":
      return {
        ...form,
        hmo: record.details.hmo,
        loaNumber: record.details.loaNumber,
        totalAmount: text(record.details.totalAmount),
        hmoCovered: text(record.details.hmoCovered),
        youPaid: text(record.details.youPaid),
      };
    case "lab":
      return {
        ...form,
        results: record.details.results.map((r) => ({
          name: r.name,
          value: r.value,
          unit: r.unit,
          rangeLow: text(r.rangeLow),
          rangeHigh: text(r.rangeHigh),
        })),
      };
    case "prescription":
      return { ...form, medicines: record.details.medicines };
    default:
      return form;
  }
}

// "1,234.50" → 1234.5; "" → null; anything else → undefined (not a number)
export function parseNumber(value: string): number | null | undefined {
  const cleaned = value.trim().replace(/,/g, "").replace(/^₱/, "");
  if (cleaned === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return undefined;
  return Number(cleaned);
}

const rowIsEmpty = (row: object) =>
  Object.values(row).every((v) => String(v).trim() === "");

// The form → what the API takes. Number boxes that aren't numbers come back
// as errors (keyed like the API's, e.g. "details.results.0.rangeLow").
export function fieldsFromForm(form: RecordFormState): {
  fields: RecordFieldsInput | null;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const number = (key: string, value: string) => {
    const parsed = parseNumber(value);
    if (parsed === undefined) {
      errors[key] = "Enter a number, like 12.5";
      return null;
    }
    return parsed;
  };
  if (!form.type) {
    return { fields: null, errors: { type: "Choose a record type" } };
  }
  const base = {
    profileId: form.profileId || null,
    title: form.title,
    recordDate: form.recordDate,
    doctor: form.doctor,
    facility: form.facility,
    notes: form.notes,
  };

  let fields: RecordFieldsInput;
  switch (form.type) {
    case "imaging":
      fields = {
        ...base,
        type: "imaging",
        details: { bodyPart: form.bodyPart, reading: form.reading },
      };
      break;
    case "vaccination":
      fields = {
        ...base,
        type: "vaccination",
        details: { vaccine: form.vaccine, dose: form.dose },
      };
      break;
    case "billing":
      fields = {
        ...base,
        type: "billing",
        details: {
          hmo: form.hmo,
          loaNumber: form.loaNumber,
          totalAmount: number("details.totalAmount", form.totalAmount),
          hmoCovered: number("details.hmoCovered", form.hmoCovered),
          youPaid: number("details.youPaid", form.youPaid),
        },
      };
      break;
    case "lab": {
      // Empty rows are left out; the numbering matches what's sent
      const rows = form.results.filter((row) => !rowIsEmpty(row));
      fields = {
        ...base,
        type: "lab",
        details: {
          results: rows.map((row, index) => ({
            name: row.name,
            value: row.value,
            unit: row.unit,
            rangeLow: number(`details.results.${index}.rangeLow`, row.rangeLow),
            rangeHigh: number(
              `details.results.${index}.rangeHigh`,
              row.rangeHigh,
            ),
          })),
        },
      };
      break;
    }
    case "prescription":
      fields = {
        ...base,
        type: "prescription",
        details: {
          medicines: form.medicines.filter((row) => !rowIsEmpty(row)),
        },
      };
      break;
    default:
      fields = { ...base, type: form.type, details: {} };
  }
  return { fields: Object.keys(errors).length ? null : fields, errors };
}

// The rows that were sent, so server errors ("details.results.2.value") land on
// the right row on screen even when empty rows were skipped
export function sentRowIndexes(rows: object[]) {
  const map: number[] = [];
  rows.forEach((row, index) => {
    if (!rowIsEmpty(row)) map.push(index);
  });
  return map;
}
