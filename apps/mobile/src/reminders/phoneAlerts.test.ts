import type { ReminderSummary } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import { planPhoneAlerts } from "./phoneAlerts";

const reminder = (over: Partial<ReminderSummary> = {}): ReminderSummary => ({
  id: "r1",
  ownerId: "o",
  kind: "medicine",
  title: "Metformin",
  dose: "500 mg",
  profileId: null,
  personName: "Maria",
  recordId: null,
  schedule: {
    start: "2026-11-13",
    times: ["08:00", "20:00"],
    repeat: { every: "day", interval: 1 },
    end: { type: "never" },
  } as ReminderSummary["schedule"],
  alerts: [0],
  paused: false,
  nextAt: "2026-11-13T12:00:00.000Z",
  mutedByMe: false,
  ...over,
});

// 7:00 AM in Manila
const now = new Date("2026-11-12T23:00:00.000Z");

describe("alerts planned on the phone", () => {
  it("plans each time's alerts for the next days, in order", () => {
    const plan = planPhoneAlerts([reminder()], new Set(), now, { days: 2 });
    expect(plan.map((p) => p.at.toISOString())).toEqual([
      "2026-11-13T00:00:00.000Z",
      "2026-11-13T12:00:00.000Z",
      "2026-11-14T00:00:00.000Z",
      "2026-11-14T12:00:00.000Z",
    ]);
    expect(plan[0]).toMatchObject({
      title: "Metformin (Maria)",
      body: "Now: 500 mg",
    });
  });

  it("alerts before the time say when it is", () => {
    const plan = planPhoneAlerts([reminder({ alerts: [30] })], new Set(), now, {
      days: 1,
    });
    expect(plan[0].at.toISOString()).toBe("2026-11-12T23:30:00.000Z");
    expect(plan[0].body).toBe("30 minutes before: at 8:00 AM · 500 mg");
  });

  it("skips paused, muted, done and skipped", () => {
    expect(
      planPhoneAlerts([reminder({ paused: true })], new Set(), now),
    ).toEqual([]);
    expect(
      planPhoneAlerts([reminder({ mutedByMe: true })], new Set(), now),
    ).toEqual([]);
    const plan = planPhoneAlerts(
      [reminder()],
      new Set(["r1|2026-11-13T00:00:00.000Z"]),
      now,
      { days: 1 },
    );
    expect(plan.map((p) => p.at.toISOString())).toEqual([
      "2026-11-13T12:00:00.000Z",
    ]);
  });

  it("keeps under the phone's limit", () => {
    expect(
      planPhoneAlerts([reminder({ alerts: [0, 10, 60] })], new Set(), now, {
        days: 30,
        max: 60,
      }),
    ).toHaveLength(60);
  });
});
