import { describe, expect, it } from "vitest";
import { formatLabelCode, normalizeLabelCode } from "./labelCode.js";

describe("label codes", () => {
  it("reads a code typed with a dash, spaces or small letters", () => {
    expect(normalizeLabelCode("7k4q-m2xd")).toBe("7K4QM2XD");
    expect(normalizeLabelCode(" 7K4Q M2XD ")).toBe("7K4QM2XD");
  });

  it("refuses codes with look-alike letters or the wrong length", () => {
    expect(normalizeLabelCode("7K4QM2X0")).toBeNull(); // 0
    expect(normalizeLabelCode("7K4QM2XI")).toBeNull(); // I
    expect(normalizeLabelCode("7K4QM2X")).toBeNull();
    expect(normalizeLabelCode("../../etc")).toBeNull();
  });

  it("prints with a dash in the middle", () => {
    expect(formatLabelCode("7K4QM2XD")).toBe("7K4Q-M2XD");
  });
});
