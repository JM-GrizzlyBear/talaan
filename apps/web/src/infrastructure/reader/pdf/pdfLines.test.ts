import { describe, expect, it } from "vitest";
import { groupIntoLines } from "./pdfLines";

const item = (str: string, x: number, y: number) => ({
  str,
  transform: [10, 0, 0, 10, x, y],
  height: 10,
});

describe("PDF text into lines", () => {
  it("joins pieces at the same height, left to right, top line first", () => {
    const lines = groupIntoLines([
      item("12.0 - 16.0", 400, 700),
      item("WBC", 50, 680),
      item("Hemoglobin", 50, 700.5),
      item("6.0", 250, 699),
      item("g/dL", 320, 700),
      item("9.1", 250, 680),
      item("   ", 10, 650),
    ]);
    expect(lines).toEqual([
      { text: "Hemoglobin 6.0 g/dL 12.0 - 16.0", confidence: null },
      { text: "WBC 9.1", confidence: null },
    ]);
  });
});
