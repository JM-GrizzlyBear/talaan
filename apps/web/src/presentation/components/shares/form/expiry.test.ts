import { describe, expect, it } from "vitest";
import { expiryDate, localInputValue } from "./expiry";

const now = new Date("2026-11-10T02:00:00Z");
const hours = (r: ReturnType<typeof expiryDate>) =>
  "at" in r ? (r.at.getTime() - now.getTime()) / 3_600_000 : r.error;

describe("how long a link lasts", () => {
  it("takes the quick choices", () => {
    expect(hours(expiryDate({ mode: "preset", key: "1h" }, now))).toBe(1);
    expect(hours(expiryDate({ mode: "preset", key: "7d" }, now))).toBe(168);
  });

  it("takes any number of hours, days or weeks", () => {
    expect(
      hours(expiryDate({ mode: "length", amount: "3", unit: "days" }, now)),
    ).toBe(72);
    expect(
      hours(expiryDate({ mode: "length", amount: "2", unit: "weeks" }, now)),
    ).toBe(336);
    expect(
      expiryDate({ mode: "length", amount: "1.5", unit: "days" }, now),
    ).toEqual({ error: "Enter a whole number, like 3" });
    expect(
      expiryDate({ mode: "length", amount: "60", unit: "weeks" }, now),
    ).toEqual({ error: "A link can last up to 365 days" });
  });

  it("takes a date and time", () => {
    const later = new Date(now.getTime() + 5 * 3_600_000);
    expect(
      hours(expiryDate({ mode: "date", value: localInputValue(later) }, now)),
    ).toBe(5);
    expect(expiryDate({ mode: "date", value: "" }, now)).toEqual({
      error: "Choose a date and time",
    });
    expect(
      "error" in expiryDate({ mode: "date", value: localInputValue(now) }, now),
    ).toBe(true);
  });
});
