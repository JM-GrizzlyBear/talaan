import { describe, expect, it } from "vitest";
import {
  excerpt,
  highlightRanges,
  normalizeSearch,
  parseSearch,
  scoreSearch,
} from "./index.js";

const score = (q: string, ...texts: string[]) =>
  scoreSearch(
    parseSearch(q),
    texts.map((text, i) => ({ text, weight: i === 0 ? 3 : 1 })),
  ).score;

describe("search", () => {
  it("ignores case, accents and punctuation", () => {
    expect(normalizeSearch("Ñiño's X-ray, 2026-03-02")).toBe(
      "ninos x ray 2026 03 02",
    );
    expect(score("nino", "Santo Niño Clinic")).toBeGreaterThan(0);
  });

  it("needs every word, at the start of a word", () => {
    expect(score("hemo", "Hemoglobin 12.8")).toBeGreaterThan(0);
    expect(score("globin", "Hemoglobin 12.8")).toBe(0);
    expect(score("cbc lukes", "CBC", "St. Luke's")).toBeGreaterThan(0);
    expect(score("cbc makati", "CBC", "St. Luke's")).toBe(0);
    expect(score("2026", "Oct 5", "2026-10-05")).toBeGreaterThan(0);
  });

  it("matches short words only whole", () => {
    expect(score("dr", "Dr. Cruz")).toBeGreaterThan(0);
    expect(score("dr", "Drawer")).toBe(0);
  });

  it("understands Filipino words, and English finds Filipino", () => {
    expect(score("dugo", "CBC")).toBeGreaterThan(0);
    expect(score("gamot", "Prescription", "Losartan")).toBeGreaterThan(0);
    expect(score("resibo", "Hospital bill")).toBeGreaterThan(0);
    expect(score("ihi", "Urinalysis")).toBeGreaterThan(0);
    expect(score("nanay", "Mother")).toBeGreaterThan(0);
    expect(score("receipt", "Resibo ng ospital")).toBeGreaterThan(0);
    expect(score("xray", "Chest X-ray")).toBeGreaterThan(0);
    expect(score("x ray", "XRAY result")).toBeGreaterThan(0);
  });

  it("ranks the title and the words as typed higher", () => {
    expect(score("cbc", "CBC", "notes")).toBeGreaterThan(
      score("cbc", "Lab", "the CBC was fine"),
    );
    expect(score("blood", "Blood chemistry")).toBeGreaterThan(
      score("dugo", "Blood chemistry"),
    );
  });

  it("finds where to highlight", () => {
    const text = "Chest X-ray at St. Luke's";
    const ranges = highlightRanges(text, parseSearch("xray lukes"));
    expect(ranges.map(([a, b]) => text.slice(a, b))).toEqual([
      "X-ray",
      "Luke's",
    ]);
    expect(
      highlightRanges("Hemoglobin, hemo", parseSearch("hemo")).length,
    ).toBe(2);
  });

  it("shows a part of a long text around the match", () => {
    const long = `${"Normal heart size. ".repeat(10)}No active lung disease.`;
    const part = excerpt(long, parseSearch("lung"), 60);
    expect(part.startsWith("…")).toBe(true);
    expect(part).toContain("lung");
    expect(part.length).toBeLessThanOrEqual(62);
  });
});
