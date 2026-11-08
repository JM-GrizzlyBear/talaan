import { describe, expect, it } from "vitest";
import { tidyUnit, UNIT } from "./units.js";

describe("units", () => {
  it("writes units the usual way", () => {
    expect(tidyUnit("mg/dl")).toBe("mg/dL");
    expect(tidyUnit("umol/L")).toBe("µmol/L");
    expect(tidyUnit("10^9/L")).toBe("x10^9/L");
  });

  it("reads x10^9/L when the ^ came out as a quote, * or °", () => {
    for (const read of ['x10"9/L', "x10*9/L", "x10°9/L", "X10^9/L"]) {
      expect(UNIT.test(read)).toBe(true);
      expect(tidyUnit(read)).toBe("x10^9/L");
    }
  });

  it("doesn't take a number or word for a unit", () => {
    expect(UNIT.test("12.0")).toBe(false);
    expect(UNIT.test("Negative")).toBe(false);
  });
});
