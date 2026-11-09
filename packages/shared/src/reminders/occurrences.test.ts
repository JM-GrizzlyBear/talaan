import { describe, expect, it } from "vitest";
import { nextOccurrences, occurrencesBetween } from "./occurrences.js";
import { type Schedule, scheduleSchema } from "./schedule.js";

const schedule = (s: unknown) => scheduleSchema.parse(s) as Schedule;
// Philippine time → readable, to compare easily
const ph = (dates: Date[]) =>
  dates.map((d) =>
    new Date(d.getTime() + 8 * 3600 * 1000)
      .toISOString()
      .slice(0, 16)
      .replace("T", " "),
  );
const at = (text: string) => new Date(`${text}:00+08:00`);

describe("when a reminder happens", () => {
  it("happens once, in Philippine time", () => {
    const once = schedule({
      start: "2026-11-10",
      times: ["09:30"],
      repeat: { every: "none" },
      end: { type: "never" },
    });
    expect(nextOccurrences(once, at("2026-11-01 00:00"), 5)).toEqual([
      new Date("2026-11-10T01:30:00Z"),
    ]);
    expect(nextOccurrences(once, at("2026-11-10 09:31"), 5)).toEqual([]);
  });

  it("happens several times a day, every day, for a number of times", () => {
    const medicine = schedule({
      start: "2026-11-10",
      times: ["20:00", "08:00"],
      repeat: { every: "day", interval: 1 },
      end: { type: "count", count: 5 },
    });
    expect(ph(nextOccurrences(medicine, at("2026-11-01 00:00"), 10))).toEqual([
      "2026-11-10 08:00",
      "2026-11-10 20:00",
      "2026-11-11 08:00",
      "2026-11-11 20:00",
      "2026-11-12 08:00",
    ]);
    // Counting starts at the first day, even when asked from later on
    expect(ph(nextOccurrences(medicine, at("2026-11-11 12:00"), 10))).toEqual([
      "2026-11-11 20:00",
      "2026-11-12 08:00",
    ]);
  });

  it("happens every few days until a date", () => {
    const s = schedule({
      start: "2026-11-10",
      times: ["07:00"],
      repeat: { every: "day", interval: 3 },
      end: { type: "until", date: "2026-11-20" },
    });
    expect(ph(nextOccurrences(s, at("2026-11-01 00:00"), 10))).toEqual([
      "2026-11-10 07:00",
      "2026-11-13 07:00",
      "2026-11-16 07:00",
      "2026-11-19 07:00",
    ]);
  });

  it("happens on chosen weekdays, every other week", () => {
    // Nov 10, 2026 is a Tuesday
    const s = schedule({
      start: "2026-11-10",
      times: ["18:00"],
      repeat: { every: "week", interval: 2, weekdays: [5, 1] },
      end: { type: "never" },
    });
    expect(ph(nextOccurrences(s, at("2026-11-01 00:00"), 4))).toEqual([
      "2026-11-13 18:00", // Fri of the first week (Mon 9th was before the start)
      "2026-11-23 18:00", // Mon, two weeks later
      "2026-11-27 18:00",
      "2026-12-07 18:00",
    ]);
  });

  it("happens on a day of the month, the last day in short months", () => {
    const s = schedule({
      start: "2027-01-31",
      times: ["10:00"],
      repeat: { every: "month", interval: 1, on: { type: "day", day: 31 } },
      end: { type: "never" },
    });
    expect(ph(nextOccurrences(s, at("2027-01-01 00:00"), 3))).toEqual([
      "2027-01-31 10:00",
      "2027-02-28 10:00",
      "2027-03-31 10:00",
    ]);
  });

  it("happens on the 2nd Tuesday or the last Friday of the month", () => {
    const second = schedule({
      start: "2026-11-01",
      times: ["09:00"],
      repeat: {
        every: "month",
        interval: 1,
        on: { type: "weekday", week: 2, weekday: 2 },
      },
      end: { type: "never" },
    });
    expect(ph(nextOccurrences(second, at("2026-11-01 00:00"), 2))).toEqual([
      "2026-11-10 09:00",
      "2026-12-08 09:00",
    ]);
    const last = schedule({
      start: "2026-11-01",
      times: ["09:00"],
      repeat: {
        every: "month",
        interval: 3,
        on: { type: "weekday", week: -1, weekday: 5 },
      },
      end: { type: "never" },
    });
    expect(ph(nextOccurrences(last, at("2026-11-01 00:00"), 2))).toEqual([
      "2026-11-27 09:00",
      "2027-02-26 09:00",
    ]);
  });

  it("happens every year, Feb 29 on Feb 28 in other years", () => {
    const s = schedule({
      start: "2028-02-29",
      times: ["08:00"],
      repeat: { every: "year", interval: 1 },
      end: { type: "never" },
    });
    expect(ph(nextOccurrences(s, at("2028-01-01 00:00"), 2))).toEqual([
      "2028-02-29 08:00",
      "2029-02-28 08:00",
    ]);
  });

  it("finds the next time quickly for an old daily reminder", () => {
    const s = schedule({
      start: "2000-01-01",
      times: ["08:00"],
      repeat: { every: "day", interval: 1 },
      end: { type: "never" },
    });
    expect(ph(nextOccurrences(s, at("2026-11-08 09:00"), 1))).toEqual([
      "2026-11-09 08:00",
    ]);
  });

  it("lists the times between two moments", () => {
    const s = schedule({
      start: "2026-11-10",
      times: ["08:00"],
      repeat: { every: "day", interval: 1 },
      end: { type: "never" },
    });
    expect(
      ph(occurrencesBetween(s, at("2026-11-11 00:00"), at("2026-11-13 08:00"))),
    ).toEqual(["2026-11-11 08:00", "2026-11-12 08:00"]);
  });
});

describe("checking a schedule", () => {
  it("refuses an end before the start, and no days in a week", () => {
    const bad = scheduleSchema.safeParse({
      start: "2026-11-10",
      times: ["08:00"],
      repeat: { every: "week", interval: 1, weekdays: [] },
      end: { type: "until", date: "2026-11-01" },
    });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues.map((i) => i.message)).toEqual(
      expect.arrayContaining(["Choose at least one day"]),
    );
  });

  it("sorts the times and drops repeats", () => {
    expect(
      schedule({
        start: "2026-11-10",
        times: ["20:00", "08:00", "08:00"],
        repeat: { every: "none" },
        end: { type: "never" },
      }).times,
    ).toEqual(["08:00", "20:00"]);
  });
});
