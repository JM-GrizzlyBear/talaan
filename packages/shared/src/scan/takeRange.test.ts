import { describe, expect, it } from "vitest";
import { takeRange } from "./takeRange.js";

const range = (text: string) => {
  const { low, high } = takeRange(text);
  return [low, high];
};

describe("normal ranges", () => {
  it("reads both ends", () => {
    expect(range("12.0 - 16.0")).toEqual([12, 16]);
    expect(range("12 to 16")).toEqual([12, 16]);
  });

  it("reads one end", () => {
    expect(range("< 5.2")).toEqual([null, 5.2]);
    expect(range("up to 40")).toEqual([null, 40]);
    expect(range("> 40")).toEqual([40, null]);
  });

  it("finds none when there isn't one", () => {
    expect(range("mg/dL")).toEqual([null, null]);
  });
});
