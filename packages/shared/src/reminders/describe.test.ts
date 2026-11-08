import { describe, expect, it } from "vitest";
import { describeAlert, describeSchedule, timeLabel } from "./describe.js";
import { type Schedule, scheduleSchema } from "./schedule.js";

const say = (s: unknown) =>
  describeSchedule(scheduleSchema.parse(s) as Schedule);

describe("saying a schedule in words", () => {
  it("says times the usual way", () => {
    expect(timeLabel("00:05")).toBe("12:05 AM");
    expect(timeLabel("12:00")).toBe("12:00 PM");
    expect(timeLabel("20:30")).toBe("8:30 PM");
  });

  it("says each kind of repeat", () => {
    expect(
      say({
        start: "2026-11-10",
        times: ["09:30"],
        repeat: { every: "none" },
        end: { type: "never" },
      }),
    ).toBe("Nov 10, 2026 at 9:30 AM");
    expect(
      say({
        start: "2026-11-10",
        times: ["08:00", "20:00"],
        repeat: { every: "day", interval: 1 },
        end: { type: "count", count: 14 },
      }),
    ).toBe(
      "Every day at 8:00 AM and 8:00 PM, from Nov 10, 2026, 14 times in all",
    );
    expect(
      say({
        start: "2026-11-10",
        times: ["18:00"],
        repeat: { every: "week", interval: 2, weekdays: [1, 3, 5] },
        end: { type: "until", date: "2027-01-31" },
      }),
    ).toBe(
      "Every 2 weeks on Mon, Wed and Fri at 6:00 PM, from Nov 10, 2026, until Jan 31, 2027",
    );
    expect(
      say({
        start: "2026-11-10",
        times: ["09:00"],
        repeat: {
          every: "month",
          interval: 6,
          on: { type: "weekday", week: -1, weekday: 5 },
        },
        end: { type: "never" },
      }),
    ).toBe("Every 6 months on the last Friday at 9:00 AM, from Nov 10, 2026");
    expect(
      say({
        start: "2026-11-10",
        times: ["09:00"],
        repeat: { every: "month", interval: 1, on: { type: "day", day: 22 } },
        end: { type: "never" },
      }),
    ).toBe("Every month on the 22nd at 9:00 AM, from Nov 10, 2026");
  });

  it("says alerts", () => {
    expect(describeAlert(0)).toBe("At the time");
    expect(describeAlert(90)).toBe("1 hour 30 minutes before");
    expect(describeAlert(1440)).toBe("1 day before");
    expect(describeAlert(10080)).toBe("1 week before");
    expect(describeAlert(2 * 1440 + 60)).toBe("2 days 1 hour before");
  });
});
