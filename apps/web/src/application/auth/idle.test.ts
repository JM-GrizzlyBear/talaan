import { describe, expect, it } from "vitest";
import { REPORT_EVERY_MS, isIdle, shouldReportActivity } from "./idle";

const minute = 60 * 1000;

describe("idle lock", () => {
  it("locks once the chosen minutes pass with nothing happening", () => {
    expect(isIdle(0, 14 * minute, 15)).toBe(false);
    expect(isIdle(0, 15 * minute, 15)).toBe(true);
    expect(isIdle(0, 5 * minute, 5)).toBe(true);
  });

  it("reports activity at most every 2 minutes, and only after new activity", () => {
    expect(shouldReportActivity(10, 0, REPORT_EVERY_MS)).toBe(true);
    expect(shouldReportActivity(10, 0, REPORT_EVERY_MS - 1)).toBe(false);
    // Nothing happened since the last report
    expect(shouldReportActivity(0, 5, 10 * minute)).toBe(false);
  });
});
