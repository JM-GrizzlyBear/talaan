import { describe, expect, it } from "vitest";
import { shortDateTime } from "./dates";

describe("dates", () => {
  it("formats a date and time for people", () => {
    expect(shortDateTime("2026-10-19T08:00:00.000Z", "en-US")).toMatch(
      /Oct 19, 2026/,
    );
  });
});
