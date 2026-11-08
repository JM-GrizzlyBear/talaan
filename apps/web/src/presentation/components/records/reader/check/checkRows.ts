import type { ReadLabRow } from "@talaan/shared";
import type { LabRow } from "../../form/recordFormState";

// A read row while it's being checked: the form's text boxes, plus whether
// to add it and why it may be wrong
export interface CheckRow extends LabRow {
  include: boolean;
  doubts: string[];
  line: string;
}

const text = (value: number | null) => (value === null ? "" : String(value));

export function toCheckRows(rows: ReadLabRow[]): CheckRow[] {
  return rows.map((row) => ({
    name: row.name,
    value: row.value,
    unit: row.unit,
    rangeLow: text(row.rangeLow),
    rangeHigh: text(row.rangeHigh),
    include: true,
    doubts: row.doubts,
    line: row.line,
  }));
}

// The ticked rows, as the form's lab rows
export function chosenRows(rows: CheckRow[]): LabRow[] {
  return rows
    .filter((row) => row.include)
    .map(({ name, value, unit, rangeLow, rangeHigh }) => ({
      name,
      value,
      unit,
      rangeLow,
      rangeHigh,
    }));
}

// Read rows go after the ones already typed (empty rows are dropped)
export function addToForm(existing: LabRow[], read: LabRow[]): LabRow[] {
  const kept = existing.filter((row) =>
    Object.values(row).some((v) => v.trim() !== ""),
  );
  return [...kept, ...read];
}
