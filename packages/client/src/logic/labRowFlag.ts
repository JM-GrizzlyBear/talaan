import { labFlag, type LabFlag } from "@talaan/shared";
import { type LabRow, parseNumber } from "./recordFormState";

// Low or High for a row still being typed (only once both ends are numbers)
export function labRowFlag(
  row: Pick<LabRow, "value" | "rangeLow" | "rangeHigh">,
): LabFlag {
  const low = parseNumber(row.rangeLow);
  const high = parseNumber(row.rangeHigh);
  if (low === undefined || high === undefined) return null;
  return labFlag({ value: row.value, rangeLow: low, rangeHigh: high });
}
