import {
  RECORD_TYPE_LABELS,
  TRASH_DAYS,
  formatRange,
  labFlag,
  type AuditChange,
  type LabResult,
  type Medicine,
  type RecordFields,
} from "@talaan/shared";

const DAY = 24 * 60 * 60 * 1000;

// When a record in the Trash is deleted for good
export function purgeAt(deletedAt: Date) {
  return new Date(deletedAt.getTime() + TRASH_DAYS * DAY);
}

// Records put in the Trash before this time are due to be deleted for good
export function purgeCutoff(now: Date) {
  return new Date(now.getTime() - TRASH_DAYS * DAY);
}

export function outOfRangeCount(fields: RecordFields) {
  if (fields.type !== "lab") return 0;
  return fields.details.results.filter((r) => labFlag(r) !== null).length;
}

// Long text (notes, readings) is shortened in the history
const MAX_SHOWN = 300;
function shown(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === "") return null;
  return text.length > MAX_SHOWN ? `${text.slice(0, MAX_SHOWN)}…` : text;
}

export function pesos(value: number | null) {
  if (value === null) return null;
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function labText(row: LabResult) {
  const range = formatRange(row);
  return [
    `${row.value}${row.unit ? ` ${row.unit}` : ""}`,
    range ? `(normal ${range})` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function medicineText(row: Medicine) {
  return [row.name, row.dose, row.frequency].filter(Boolean).join(", ");
}

// Rows are matched by name; a repeated name is matched by its order ("CBC", "CBC #2")
function keyed<T>(rows: T[], nameOf: (row: T) => string) {
  const counts = new Map<string, number>();
  const map = new Map<string, { row: T; label: string }>();
  for (const row of rows) {
    const name = nameOf(row).trim();
    const base = name.toLowerCase();
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    map.set(`${base}#${n}`, { row, label: n === 1 ? name : `${name} #${n}` });
  }
  return map;
}

function diffRows<T>(
  before: T[],
  after: T[],
  options: {
    nameOf: (row: T) => string;
    describe: (row: T) => string;
    added: string;
    removed: string;
    // The parts of one row that can change
    parts: { label: string; value: (row: T) => string | null }[];
  },
) {
  const changes: AuditChange[] = [];
  const old = keyed(before, options.nameOf);
  const now = keyed(after, options.nameOf);
  for (const [key, { row, label }] of old) {
    const match = now.get(key);
    if (!match) {
      changes.push({
        field: options.removed,
        from: `${label}: ${options.describe(row)}`,
        to: null,
      });
      continue;
    }
    for (const part of options.parts) {
      const from = shown(part.value(row));
      const to = shown(part.value(match.row));
      if (from !== to)
        changes.push({ field: `${label} ${part.label}`, from, to });
    }
  }
  for (const [key, { row, label }] of now) {
    if (!old.has(key)) {
      changes.push({
        field: options.added,
        from: null,
        to: `${label}: ${options.describe(row)}`,
      });
    }
  }
  return changes;
}

// The type-specific fields as label → text, for comparing
function detailFields(fields: RecordFields): [string, string | null][] {
  switch (fields.type) {
    case "imaging":
      return [
        ["What was imaged", shown(fields.details.bodyPart)],
        ["Reading", shown(fields.details.reading)],
      ];
    case "vaccination":
      return [
        ["Vaccine", shown(fields.details.vaccine)],
        ["Dose", shown(fields.details.dose)],
      ];
    case "billing":
      return [
        ["HMO", shown(fields.details.hmo)],
        ["LOA / approval number", shown(fields.details.loaNumber)],
        ["Total bill", pesos(fields.details.totalAmount)],
        ["HMO covered", pesos(fields.details.hmoCovered)],
        ["You paid", pesos(fields.details.youPaid)],
      ];
    default:
      return [];
  }
}

const EMPTY_LAB: LabResult[] = [];
const EMPTY_MEDICINES: Medicine[] = [];

// Exactly what changed in an edit, in words people can read in the history.
// personName turns a profile id (or null for the owner) into a name.
export function diffRecords(
  before: RecordFields,
  after: RecordFields,
  personName: (profileId: string | null) => string,
): AuditChange[] {
  const changes: AuditChange[] = [];
  const compare = (field: string, from: string | null, to: string | null) => {
    if (from !== to) changes.push({ field, from, to });
  };

  compare(
    "Type",
    RECORD_TYPE_LABELS[before.type],
    RECORD_TYPE_LABELS[after.type],
  );
  compare("For", personName(before.profileId), personName(after.profileId));
  compare("Title", shown(before.title), shown(after.title));
  compare("Date", before.recordDate, after.recordDate);
  compare("Doctor", shown(before.doctor), shown(after.doctor));
  compare("Clinic or hospital", shown(before.facility), shown(after.facility));
  compare("Notes", shown(before.notes), shown(after.notes));

  // Same-type fields are compared one by one; a new type compares against empty
  const oldDetails = new Map(detailFields(before));
  const newDetails = detailFields(after);
  for (const [label, value] of newDetails) {
    compare(label, oldDetails.get(label) ?? null, value);
    oldDetails.delete(label);
  }
  for (const [label, value] of oldDetails) compare(label, value, null);

  changes.push(
    ...diffRows(
      before.type === "lab" ? before.details.results : EMPTY_LAB,
      after.type === "lab" ? after.details.results : EMPTY_LAB,
      {
        nameOf: (r) => r.name,
        describe: labText,
        added: "Lab test added",
        removed: "Lab test removed",
        parts: [
          {
            label: "result",
            value: (r) => `${r.value}${r.unit ? ` ${r.unit}` : ""}`,
          },
          { label: "normal range", value: (r) => formatRange(r) || null },
        ],
      },
    ),
    ...diffRows(
      before.type === "prescription"
        ? before.details.medicines
        : EMPTY_MEDICINES,
      after.type === "prescription" ? after.details.medicines : EMPTY_MEDICINES,
      {
        nameOf: (m) => m.name,
        describe: medicineText,
        added: "Medicine added",
        removed: "Medicine removed",
        parts: [
          { label: "dose", value: (m) => m.dose },
          { label: "how often", value: (m) => m.frequency },
        ],
      },
    ),
  );
  return changes;
}
