import { describe, expect, it } from "vitest";
import { deleteAfterFor, nextStep } from "../../src/domain/account/rules.js";

const DAY = 24 * 60 * 60 * 1000;
const start = new Date("2026-11-10T02:00:00Z");
const at = (days: number) => new Date(start.getTime() + days * DAY);
const suspended = {
  suspendedAt: start,
  deleteAfter: deleteAfterFor(start),
  remindedAt: null,
  warnedAt: null,
};

describe("a suspended account", () => {
  it("is deleted a year later", () => {
    expect(suspended.deleteAfter).toEqual(at(365));
    expect(nextStep(suspended, at(365))).toBe("delete");
  });

  it("gets an email at 6 months and a week before", () => {
    expect(nextStep(suspended, at(181))).toBeNull();
    expect(nextStep(suspended, at(182))).toBe("remind");
    const reminded = { ...suspended, remindedAt: at(182) };
    expect(nextStep(reminded, at(300))).toBeNull();
    expect(nextStep(reminded, at(358))).toBe("warn");
    expect(nextStep({ ...reminded, warnedAt: at(358) }, at(364))).toBeNull();
  });

  it("skips the 6-month email when it's already the last week", () => {
    expect(nextStep(suspended, at(360))).toBe("warn");
    expect(nextStep({ ...suspended, warnedAt: at(360) }, at(361))).toBeNull();
  });
});
