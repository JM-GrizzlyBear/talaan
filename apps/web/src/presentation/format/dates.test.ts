import { describe, expect, it } from "vitest";
import { note } from "../../test/fixtures/notes";
import { shortDateTime, wasEdited } from "./dates";

describe("dates", () => {
  it("formats a date and time for people", () => {
    expect(shortDateTime("2026-10-19T08:00:00.000Z", "en-US")).toMatch(
      /Oct 19, 2026/,
    );
  });

  it("knows when a note was edited", () => {
    expect(wasEdited(note())).toBe(false);
    expect(wasEdited(note({ updatedAt: "2026-10-19T09:00:00.000Z" }))).toBe(
      true,
    );
  });
});
