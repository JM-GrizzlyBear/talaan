import { describe, expect, it } from "vitest";
import { readLabLine } from "./readLabLines.js";

const read = (text: string, confidence: number | null = 95) =>
  readLabLine({ text, confidence });

describe("knowing what to skip and what it isn't sure of", () => {
  it("reads a test not on the list only when it has a range, and says so", () => {
    expect(read("Ferritin 15 ng/mL 30 - 400")).toMatchObject({
      name: "Ferritin",
      value: "15",
      doubts: ["Not a test Talaan knows: check the name"],
    });
    expect(read("Ferritin 15 ng/mL")).toBeNull();
  });

  it("ignores lines that aren't results", () => {
    for (const line of [
      "Name: Juan Dela Cruz Age: 45",
      "Date: 2026-10-15",
      "Test Result Unit Reference",
      "COMPLETE BLOOD COUNT",
      "Requested by: Dr. 12 Cruz 1-2",
      "",
      "Page 1 of 2",
    ]) {
      expect(read(line), line).toBeNull();
    }
  });

  it("flags what it isn't sure of", () => {
    expect(read("Hemoglobin 6.0 g/dL 12.0-16.0", 52)?.doubts).toEqual([
      "Hard to read on the photo",
    ]);
    expect(read("Hemoglobin 1O.5 g/dL 12.0-16.0")).toMatchObject({
      value: "10.5",
      doubts: ["A letter O was read as 0"],
    });
    expect(read("WBC 9.1 x10^9/L 11.0-4.5")).toMatchObject({
      rangeLow: null,
      rangeHigh: null,
      doubts: ["The normal range looks wrong"],
    });
  });

  it("never invents a range the printout doesn't show", () => {
    expect(read("Hemoglobin 13.5 g/dL")).toMatchObject({
      rangeLow: null,
      rangeHigh: null,
      doubts: [],
    });
  });

  it("is exact for a PDF's own text (no reading doubts)", () => {
    expect(read("Hemoglobin 6.0 g/dL 12.0-16.0", null)?.doubts).toEqual([]);
  });
});
