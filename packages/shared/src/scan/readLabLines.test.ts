import { describe, expect, it } from "vitest";
import { readLabLines } from "./readLabLines.js";

describe("reading a whole printout", () => {
  it("keeps the results, in order, once each", () => {
    const rows = readLabLines(
      [
        "SAMPLE GENERAL HOSPITAL - LABORATORY",
        "Patient: Juan Dela Cruz (sample) · Date: 2026-10-15",
        "COMPLETE BLOOD COUNT",
        "Test Result Unit Reference",
        "Hemoglobin 6.0 g/dL 12.0 - 16.0",
        "Hematocrit 0.38 0.37 - 0.47",
        "WBC 9.1 x10^9/L 4.5 - 11.0",
        "WBC 9.1 x10^9/L 4.5 - 11.0",
      ].map((text) => ({ text, confidence: 90 })),
    );
    expect(rows.map((r) => [r.name, r.value])).toEqual([
      ["Hemoglobin", "6.0"],
      ["Hematocrit", "0.38"],
      ["WBC", "9.1"],
    ]);
  });
});
