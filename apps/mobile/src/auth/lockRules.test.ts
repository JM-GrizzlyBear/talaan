import { describe, expect, it } from "vitest";
import { shouldLockOnReturn } from "./lockRules";

describe("locking when coming back to the app", () => {
  const minute = 60 * 1000;
  it("locks after the person's time away", () => {
    expect(shouldLockOnReturn(0, 14 * minute, 15)).toBe(false);
    expect(shouldLockOnReturn(0, 15 * minute, 15)).toBe(true);
    expect(shouldLockOnReturn(0, 2 * minute, 1)).toBe(true);
  });
  it("doesn't lock when it never left", () => {
    expect(shouldLockOnReturn(null, 99 * minute, 1)).toBe(false);
  });
});
