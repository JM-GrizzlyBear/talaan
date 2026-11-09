import { labFlag, type LabFlag } from "../records/lab.js";
import type { LabResult } from "../records/schemas.js";
import { BLOOD_COUNT_TESTS } from "../scan/tests/bloodCount.js";
import { CHEMISTRY_TESTS } from "../scan/tests/chemistry.js";
import { KNOWN_LAB_TESTS } from "../scan/tests/index.js";
import { URINALYSIS_TESTS } from "../scan/tests/urinalysis.js";
import { conversionFactor, roundLab, unitKey } from "./units.js";

export const LAB_GROUPS = [
  "Blood count",
  "Chemistry",
  "Urinalysis",
  "Other",
] as const;
export type LabGroup = (typeof LAB_GROUPS)[number];

// One lab record's results, as the comparison takes them
export interface LabRecordResults {
  recordId: string;
  title: string;
  // "YYYY-MM-DD"
  date: string;
  facility: string;
  results: LabResult[];
}

export interface LabPoint {
  recordId: string;
  date: string;
  facility: string;
  // As written on the record ("6.0", "<0.5", "Negative")
  written: string;
  writtenUnit: string;
  // In the test's unit; null for words ("Negative") or units that can't be
  // converted
  value: number | null;
  // "<" or ">" when the result was "<0.5" or ">200"
  sign: "<" | ">" | null;
  // What to show: converted when needed, otherwise as written
  shown: string;
  rangeLow: number | null;
  rangeHigh: number | null;
  flag: LabFlag;
  // Converted from writtenUnit to the test's unit
  converted: boolean;
  // A unit that can't be converted to the test's unit
  otherUnit: boolean;
}

export interface LabSeries {
  // Stays the same for a test however it's written ("sgpt", "alt")
  key: string;
  name: string;
  group: LabGroup;
  // The unit used most for this test (others are converted to it)
  unit: string;
  // Any results that are numbers (so it can be charted)
  numeric: boolean;
  // Oldest first
  points: LabPoint[];
}

const PANELS: [LabGroup, { name: string }[]][] = [
  ["Blood count", BLOOD_COUNT_TESTS],
  ["Chemistry", CHEMISTRY_TESTS],
  ["Urinalysis", URINALYSIS_TESTS],
];
const groupOf = (name: string): LabGroup =>
  PANELS.find(([, tests]) => tests.some((t) => t.name === name))?.[0] ??
  "Other";

const normalize = (name: string) =>
  name
    .toLowerCase()
    .replace(/[.:,;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Different tests that the lab reader's names would mix up
const KEEP_APART = [/\bionized\b/, /\burine\b/, /\b24[- ]?h(ou)?r\b/];

// "SGPT", "ALT", "Alanine aminotransferase" → "SGPT / ALT"; unknown names
// stay as they are (only spacing and case ignored)
export function matchLabTest(name: string): { key: string; name: string } {
  const plain = normalize(name);
  const inside = /\(([^)]+)\)/.exec(plain)?.[1]?.trim();
  const outside = plain
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!KEEP_APART.some((re) => re.test(plain))) {
    for (const candidate of [plain, outside, inside]) {
      if (!candidate) continue;
      const test = KNOWN_LAB_TESTS.find(
        (t) =>
          t.name.toLowerCase() === candidate || t.aliases.includes(candidate),
      );
      if (test) return { key: test.name.toLowerCase(), name: test.name };
    }
  }
  return { key: plain, name: name.trim() };
}

// "<0.5" → 0.5 with "<"; "1,250" → 1250; words → null
export function labNumber(written: string): {
  value: number | null;
  sign: "<" | ">" | null;
} {
  const text = written.trim().replace(/,/g, "");
  const match = /^([<>])?\s*=?\s*(-?\d+(?:\.\d+)?)$/.exec(text);
  if (!match) return { value: null, sign: null };
  return {
    value: Number(match[2]),
    sign: (match[1] as "<" | ">" | undefined) ?? null,
  };
}

// The unit used most (the newest one when tied); "" when none
function commonUnit(points: { writtenUnit: string; date: string }[]) {
  const counts = new Map<
    string,
    { count: number; latest: string; unit: string }
  >();
  for (const p of points) {
    if (!p.writtenUnit.trim()) continue;
    const key = unitKey(p.writtenUnit);
    const seen = counts.get(key) ?? {
      count: 0,
      latest: "",
      unit: p.writtenUnit,
    };
    seen.count++;
    if (p.date >= seen.latest) {
      seen.latest = p.date;
      seen.unit = p.writtenUnit;
    }
    counts.set(key, seen);
  }
  const best = [...counts.values()].sort(
    (a, b) => b.count - a.count || b.latest.localeCompare(a.latest),
  )[0];
  return best?.unit ?? "";
}

// Every test across the records, each with its results oldest first, units
// converted to the one used most. Tests are ordered by group, then by the
// order they're printed in (CBC: Hemoglobin first…), then by name.
export function buildLabSeries(records: LabRecordResults[]): LabSeries[] {
  const raw = new Map<
    string,
    { name: string; rows: { record: LabRecordResults; result: LabResult }[] }
  >();
  for (const record of records) {
    for (const result of record.results) {
      const test = matchLabTest(result.name);
      const entry = raw.get(test.key) ?? { name: test.name, rows: [] };
      entry.rows.push({ record, result });
      raw.set(test.key, entry);
    }
  }

  const order = new Map(KNOWN_LAB_TESTS.map((t, i) => [t.name, i]));
  const series: LabSeries[] = [];
  for (const [key, { name, rows }] of raw) {
    rows.sort(
      (a, b) =>
        a.record.date.localeCompare(b.record.date) ||
        a.record.recordId.localeCompare(b.record.recordId),
    );
    const unit = commonUnit(
      rows.map((r) => ({ writtenUnit: r.result.unit, date: r.record.date })),
    );
    const points = rows.map(({ record, result }): LabPoint => {
      const { value, sign } = labNumber(result.value);
      const factor =
        !result.unit.trim() || !unit
          ? 1
          : conversionFactor(name, result.unit, unit);
      const converted = factor !== null && factor !== 1;
      // Unchanged numbers stay exactly as written
      const scale = (n: number | null) =>
        n === null || factor === null
          ? null
          : factor === 1
            ? n
            : roundLab(n * factor);
      const shownValue = value === null ? null : scale(value);
      return {
        recordId: record.recordId,
        date: record.date,
        facility: record.facility,
        written: result.value,
        writtenUnit: result.unit,
        value: shownValue,
        sign,
        shown:
          converted && shownValue !== null
            ? `${sign ?? ""}${shownValue}`
            : result.value,
        rangeLow: factor === null ? result.rangeLow : scale(result.rangeLow),
        rangeHigh: factor === null ? result.rangeHigh : scale(result.rangeHigh),
        flag:
          factor === null || sign
            ? null
            : labFlag({
                value: shownValue === null ? result.value : String(shownValue),
                rangeLow: scale(result.rangeLow),
                rangeHigh: scale(result.rangeHigh),
              }),
        converted,
        otherUnit: factor === null,
      };
    });
    series.push({
      key,
      name,
      group: groupOf(name),
      unit,
      numeric: points.some((p) => p.value !== null && !p.otherUnit),
      points,
    });
  }
  const rank = (s: LabSeries) => order.get(s.name) ?? Infinity;
  return series.sort(
    (a, b) =>
      LAB_GROUPS.indexOf(a.group) - LAB_GROUPS.indexOf(b.group) ||
      rank(a) - rank(b) ||
      a.name.localeCompare(b.name),
  );
}

export interface LabStats {
  latest: LabPoint;
  previous: LabPoint | null;
  // Latest − previous, in the test's unit (numbers only)
  change: number | null;
  changePercent: number | null;
  lowest: number | null;
  highest: number | null;
  average: number | null;
  timesOutOfRange: number;
}

// The numbers about one test, for its own page and the print-out
export function labStats(series: LabSeries): LabStats | null {
  const points = series.points;
  if (points.length === 0) return null;
  const latest = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const numbers = points
    .filter((p) => p.value !== null && !p.otherUnit && !p.sign)
    .map((p) => p.value as number);
  const change =
    previous?.value != null &&
    latest.value !== null &&
    !latest.otherUnit &&
    !previous.otherUnit
      ? roundLab(latest.value - previous.value)
      : null;
  return {
    latest,
    previous,
    change,
    changePercent:
      change !== null && previous?.value
        ? Math.round((change / previous.value) * 1000) / 10
        : null,
    lowest: numbers.length ? Math.min(...numbers) : null,
    highest: numbers.length ? Math.max(...numbers) : null,
    average: numbers.length
      ? roundLab(numbers.reduce((a, b) => a + b, 0) / numbers.length)
      : null,
    timesOutOfRange: points.filter((p) => p.flag !== null).length,
  };
}

// Tests whose latest result is outside the normal range, furthest out first
export function needsAttention(series: LabSeries[]) {
  const far = (p: LabPoint) => {
    if (p.value === null) return 0;
    if (p.flag === "high" && p.rangeHigh) return p.value / p.rangeHigh;
    if (p.flag === "low" && p.rangeLow && p.value > 0)
      return p.rangeLow / p.value;
    return 1;
  };
  return series
    .filter((s) => s.points.at(-1)?.flag)
    .sort((a, b) => far(b.points.at(-1)!) - far(a.points.at(-1)!));
}
