import { describe, expect, it } from "vitest";
import {
  emptyReminder,
  fieldsFromForm,
  formFromReminder,
  supplyCount,
} from "./reminderFormState";
import type { ReminderInfo } from "@talaan/shared";

// Nov 10, 2026 is a Tuesday
const base = {
  ...emptyReminder("2026-11-10"),
  kind: "medicine" as const,
  title: "Metformin",
};

describe("the reminder form", () => {
  it("starts on today, at 8 AM, once, with an alert at the time", () => {
    expect(emptyReminder("2026-11-10")).toMatchObject({
      start: "2026-11-10",
      times: ["08:00"],
      repeat: "none",
      weekdays: [2],
      monthDay: "10",
      monthWeek: "2",
      alerts: [0],
    });
  });

  it("turns “for 7 days” into a last day", () => {
    const { fields } = fieldsFromForm({
      ...base,
      repeat: "day",
      end: "days",
      days: "7",
    });
    expect(fields?.schedule.end).toEqual({ type: "until", date: "2026-11-16" });
  });

  it("turns “until the bottle runs out” into a number of times", () => {
    expect(supplyCount("30", "2")).toBe(15);
    expect(supplyCount("", "1")).toBeNull();
    const { fields } = fieldsFromForm({
      ...base,
      repeat: "day",
      end: "supply",
      pills: "30",
      perDose: "2",
    });
    expect(fields?.schedule.end).toEqual({ type: "count", count: 15 });
    expect(
      fieldsFromForm({ ...base, repeat: "day", end: "supply", pills: "" })
        .errors,
    ).toHaveProperty("pills");
  });

  it("builds each kind of repeat", () => {
    const week = fieldsFromForm({
      ...base,
      repeat: "week",
      interval: "2",
      weekdays: [1, 4],
    });
    expect(week.fields?.schedule.repeat).toEqual({
      every: "week",
      interval: 2,
      weekdays: [1, 4],
    });
    const month = fieldsFromForm({
      ...base,
      repeat: "month",
      monthOn: "weekday",
      monthWeek: "-1",
      monthWeekday: "5",
    });
    expect(month.fields?.schedule.repeat).toEqual({
      every: "month",
      interval: 1,
      on: { type: "weekday", week: -1, weekday: 5 },
    });
  });

  it("marks boxes that aren't whole numbers", () => {
    const { fields, errors } = fieldsFromForm({
      ...base,
      repeat: "day",
      interval: "two",
      end: "count",
      count: "0",
    });
    expect(fields).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(["count", "interval"]);
  });

  it("keeps a dose only for medicine, and an end only when it repeats", () => {
    const checkup = fieldsFromForm({
      ...base,
      kind: "checkup",
      dose: "left over",
      end: "count",
      count: "3",
    });
    expect(checkup.fields?.dose).toBe("");
    expect(checkup.fields?.schedule.end).toEqual({ type: "never" });
  });

  it("goes back into the form the same way it came out", () => {
    const { fields } = fieldsFromForm({
      ...base,
      times: ["08:00", "20:00"],
      repeat: "month",
      interval: "3",
      monthDay: "31",
      end: "until",
      until: "2027-06-30",
      alerts: [0, 30],
    });
    const info = {
      ...fields,
      profileId: null,
      recordId: null,
    } as unknown as ReminderInfo;
    const again = fieldsFromForm(formFromReminder(info)).fields;
    expect(again).toEqual(fields);
  });
});
