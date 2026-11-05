import type { LabResult } from "./schemas.js";

export type LabFlag = "low" | "high" | null;

// "6.0" below 12 → "low". Only plain numbers are compared ("<0.5", "Negative" aren't).
export function labFlag(
  result: Pick<LabResult, "value" | "rangeLow" | "rangeHigh">,
): LabFlag {
  const value = result.value.trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  if (result.rangeLow !== null && number < result.rangeLow) return "low";
  if (result.rangeHigh !== null && number > result.rangeHigh) return "high";
  return null;
}

// "12–16", "< 200", "> 40", or "" when no range
export function formatRange(result: Pick<LabResult, "rangeLow" | "rangeHigh">) {
  const { rangeLow: low, rangeHigh: high } = result;
  if (low !== null && high !== null) return `${low}–${high}`;
  if (high !== null) return `< ${high}`;
  if (low !== null) return `> ${low}`;
  return "";
}
