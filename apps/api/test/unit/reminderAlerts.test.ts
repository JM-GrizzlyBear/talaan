import { type Schedule, scheduleSchema } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import {
  dueAlerts,
  latestPerOccurrence,
  nextAlertAt,
  nextPending,
} from "../../src/domain/reminder/alertPlan.js";
import type { Occurrence } from "../../src/domain/reminder/Reminder.js";

const at = (text: string) => new Date(`${text}:00+08:00`);
// Every day at 8 AM from Nov 10, 2026, alerts 30 minutes before and at the time
const daily = {
  schedule: scheduleSchema.parse({
    start: "2026-11-10",
    times: ["08:00"],
    repeat: { every: "day", interval: 1 },
    end: { type: "never" },
  }) as Schedule,
  alerts: [0, 30],
  paused: false,
};
const state = (
  time: string,
  s: Occurrence["state"],
  snoozedUntil: string | null = null,
): Occurrence => ({
  reminderId: "r",
  occursAt: at(time),
  state: s,
  snoozedUntil: snoozedUntil ? at(snoozedUntil) : null,
  byName: null,
});

describe("which alerts are due", () => {
  it("finds the alerts in the window", () => {
    const due = dueAlerts(
      daily,
      [],
      at("2026-11-10 07:00"),
      at("2026-11-10 08:00"),
    );
    expect(due.map((d) => [d.alertAt, d.minutesBefore])).toEqual([
      [at("2026-11-10 07:30"), 30],
      [at("2026-11-10 08:00"), 0],
    ]);
    // The window's start is left out (already handled)
    expect(
      dueAlerts(daily, [], at("2026-11-10 07:30"), at("2026-11-10 07:59")),
    ).toEqual([]);
  });

  it("sends nothing more for a time marked done or skipped", () => {
    const due = dueAlerts(
      daily,
      [state("2026-11-10 08:00", "done")],
      at("2026-11-10 07:00"),
      at("2026-11-11 08:00"),
    );
    expect(due.map((d) => d.occursAt)).toEqual([
      at("2026-11-11 08:00"),
      at("2026-11-11 08:00"),
    ]);
  });

  it("sends one alert when a snooze ends, instead of the time's own", () => {
    const states = [state("2026-11-10 08:00", "snoozed", "2026-11-10 09:00")];
    const due = dueAlerts(
      daily,
      states,
      at("2026-11-10 07:45"),
      at("2026-11-10 09:00"),
    );
    expect(due).toEqual([
      {
        occursAt: at("2026-11-10 08:00"),
        alertAt: at("2026-11-10 09:00"),
        minutesBefore: null,
      },
    ]);
  });

  it("keeps only the latest alert of each time after a gap", () => {
    const due = dueAlerts(
      daily,
      [],
      at("2026-11-10 07:00"),
      at("2026-11-10 08:00"),
    );
    expect(latestPerOccurrence(due).map((d) => d.minutesBefore)).toEqual([0]);
  });
});

describe("the next alert", () => {
  it("is the earliest alert after now", () => {
    expect(nextAlertAt(daily, [], at("2026-11-10 07:31"))).toEqual(
      at("2026-11-10 08:00"),
    );
    expect(nextAlertAt(daily, [], at("2026-11-10 08:00"))).toEqual(
      at("2026-11-11 07:30"),
    );
  });

  it("skips times already done, and counts snoozes", () => {
    expect(
      nextAlertAt(
        daily,
        [state("2026-11-11 08:00", "done")],
        at("2026-11-10 08:00"),
      ),
    ).toEqual(at("2026-11-12 07:30"));
    expect(
      nextAlertAt(
        daily,
        [state("2026-11-10 08:00", "snoozed", "2026-11-10 08:10")],
        at("2026-11-10 08:00"),
      ),
    ).toEqual(at("2026-11-10 08:10"));
  });

  it("is none when paused, ended, or without alerts", () => {
    expect(
      nextAlertAt({ ...daily, paused: true }, [], at("2026-11-10 07:00")),
    ).toBeNull();
    const once = {
      ...daily,
      schedule: { ...daily.schedule, repeat: { every: "none" as const } },
    };
    expect(nextAlertAt(once, [], at("2026-11-10 08:00"))).toBeNull();
    expect(
      nextAlertAt({ ...daily, alerts: [] }, [], at("2026-11-10 07:00")),
    ).toBeNull();
  });
});

describe("the next time still waiting", () => {
  it("passes over times done or skipped, not snoozed ones", () => {
    expect(
      nextPending(
        daily.schedule,
        [
          state("2026-11-10 08:00", "done"),
          state("2026-11-11 08:00", "snoozed", "2026-11-11 09:00"),
        ],
        at("2026-11-10 00:00"),
      ),
    ).toEqual(at("2026-11-11 08:00"));
  });
});
