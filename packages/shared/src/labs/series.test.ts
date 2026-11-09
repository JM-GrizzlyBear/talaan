import { describe, expect, it } from "vitest";
import type { LabResult } from "../records/schemas.js";
import {
  buildLabSeries,
  labNumber,
  labStats,
  type LabRecordResults,
  matchLabTest,
  needsAttention,
} from "./series.js";
import { conversionFactor, unitKey } from "./units.js";

const row = (
  name: string,
  value: string,
  unit = "",
  rangeLow: number | null = null,
  rangeHigh: number | null = null,
): LabResult => ({ name, value, unit, rangeLow, rangeHigh });

const record = (
  id: string,
  date: string,
  results: LabResult[],
): LabRecordResults => ({
  recordId: id,
  title: "Lab",
  date,
  facility: "",
  results,
});

describe("matching test names", () => {
  it("lines up other names for the same test", () => {
    expect(matchLabTest("SGPT").key).toBe(matchLabTest("ALT").key);
    expect(matchLabTest("Fasting Blood Sugar").name).toBe("FBS");
    expect(matchLabTest("Hemoglobin (Hgb)").name).toBe("Hemoglobin");
    expect(matchLabTest("HGB").name).toBe("Hemoglobin");
  });

  it("keeps different tests apart", () => {
    expect(matchLabTest("Ionized calcium").name).toBe("Ionized calcium");
    expect(matchLabTest("Calcium").name).toBe("Calcium");
    expect(matchLabTest("Vitamin D ").key).toBe("vitamin d");
  });
});

describe("units", () => {
  it("spells units one way", () => {
    expect(unitKey("µmol/L")).toBe(unitKey("umol/l"));
    expect(unitKey("x10^9/L")).toBe(unitKey("10^9/L"));
    expect(unitKey("/cumm")).toBe("/ul");
    expect(unitKey("mEq/L")).toBe("mmol/l");
  });

  it("converts only known, fixed conversions", () => {
    expect(conversionFactor("FBS", "mmol/L", "mg/dL")).toBeCloseTo(18.016);
    expect(conversionFactor("Creatinine", "mg/dL", "µmol/L")).toBeCloseTo(
      88.42,
    );
    expect(conversionFactor("Hemoglobin", "g/L", "g/dL")).toBeCloseTo(0.1);
    expect(conversionFactor("Vitamin D", "ng/mL", "nmol/L")).toBeCloseTo(2.496);
    expect(conversionFactor("Ferritin", "ng/mL", "pmol/L")).toBeNull();
  });

  it("reads numbers as labs write them", () => {
    expect(labNumber("1,250")).toEqual({ value: 1250, sign: null });
    expect(labNumber("< 0.5")).toEqual({ value: 0.5, sign: "<" });
    expect(labNumber("Negative")).toEqual({ value: null, sign: null });
  });
});

describe("a test's results over time", () => {
  const records = [
    record("b", "2026-03-01", [
      row("FBS", "6.1", "mmol/L", 3.9, 6.1),
      row("Hemoglobin", "118", "g/L", 120, 160),
    ]),
    record("a", "2025-09-01", [
      row("Fasting Blood Sugar", "98", "mg/dL", 70, 110),
      row("Urine protein", "Negative"),
    ]),
    record("c", "2026-09-01", [
      row("FBS", "130", "mg/dL", 70, 110),
      row("Hgb", "12.5", "g/dL", 12, 16),
    ]),
  ];
  const series = buildLabSeries(records);
  const fbs = series.find((s) => s.name === "FBS")!;

  it("lines up names, oldest first, in the unit used most", () => {
    expect(fbs.unit).toBe("mg/dL");
    expect(fbs.points.map((p) => [p.date, p.shown, p.converted])).toEqual([
      ["2025-09-01", "98", false],
      ["2026-03-01", "110", true],
      ["2026-09-01", "130", false],
    ]);
    // The range converts too, and Low/High follow the converted values
    expect(fbs.points[1]).toMatchObject({ rangeLow: 70.3, rangeHigh: 110 });
    expect(fbs.points.map((p) => p.flag)).toEqual([null, null, "high"]);
  });

  it("converts g/L to g/dL for hemoglobin", () => {
    const hgb = series.find((s) => s.name === "Hemoglobin")!;
    // A tie: the newest unit wins
    expect(hgb.unit).toBe("g/dL");
    expect(hgb.points.map((p) => [p.shown, p.flag])).toEqual([
      ["11.8", "low"],
      ["12.5", null],
    ]);
  });

  it("keeps word results, and doesn't chart them", () => {
    const protein = series.find((s) => s.key === "urine protein")!;
    expect(protein.numeric).toBe(false);
    expect(protein.points[0].shown).toBe("Negative");
  });

  it("marks a unit it can't convert, and leaves it out of the numbers", () => {
    const odd = buildLabSeries([
      record("a", "2026-01-01", [row("Ferritin", "30", "ng/mL")]),
      record("b", "2026-02-01", [row("Ferritin", "40", "ng/mL")]),
      record("c", "2026-03-01", [row("Ferritin", "75", "pmol/L")]),
    ])[0];
    expect(odd.unit).toBe("ng/mL");
    expect(odd.points.map((p) => p.otherUnit)).toEqual([false, false, true]);
    expect(labStats(odd)).toMatchObject({
      lowest: 30,
      highest: 40,
      change: null,
    });
  });

  it("orders tests by group, and the way labs print them", () => {
    expect(series.map((s) => `${s.group}: ${s.name}`)).toEqual([
      "Blood count: Hemoglobin",
      "Chemistry: FBS",
      "Other: Urine protein",
    ]);
  });

  it("works out the change, lowest, highest and average", () => {
    expect(labStats(fbs)).toMatchObject({
      change: 20,
      changePercent: 18.2,
      lowest: 98,
      highest: 130,
      average: 113,
      timesOutOfRange: 1,
    });
  });

  it("lists the latest results out of range, furthest out first", () => {
    expect(needsAttention(series).map((s) => s.name)).toEqual(["FBS"]);
  });
});
