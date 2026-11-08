import { z } from "zod";
import { REMINDER_LIMITS } from "./constants.js";

const dateText = z.iso.date({ error: "Enter a date" });
const timeText = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Enter a time like 08:00" });
const interval = z
  .number({ error: "Enter a number" })
  .int({ error: "Enter a whole number" })
  .min(1, { error: "At least 1" })
  .max(REMINDER_LIMITS.interval, {
    error: `At most ${REMINDER_LIMITS.interval}`,
  });

// 0 Sunday … 6 Saturday
const weekday = z.number().int().min(0).max(6);

export const repeatSchema = z.discriminatedUnion("every", [
  z.object({ every: z.literal("none") }),
  z.object({ every: z.literal("day"), interval }),
  z.object({
    every: z.literal("week"),
    interval,
    weekdays: z
      .array(weekday)
      .min(1, { error: "Choose at least one day" })
      .max(7)
      .transform((days) => [...new Set(days)].sort()),
  }),
  z.object({
    every: z.literal("month"),
    interval,
    on: z.discriminatedUnion("type", [
      // The 15th; 29–31 fall on the last day in shorter months
      z.object({
        type: z.literal("day"),
        day: z.number().int().min(1).max(31),
      }),
      // The 2nd Tuesday, or the last Friday (week -1)
      z.object({
        type: z.literal("weekday"),
        week: z.union([z.literal(-1), z.number().int().min(1).max(4)]),
        weekday,
      }),
    ]),
  }),
  z.object({ every: z.literal("year"), interval }),
]);
export type Repeat = z.infer<typeof repeatSchema>;

export const endSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("never") }),
  // The last day it can happen (that whole day counts)
  z.object({ type: z.literal("until"), date: dateText }),
  // How many times in all (each time of day counts once)
  z.object({
    type: z.literal("count"),
    count: z
      .number({ error: "Enter a number" })
      .int({ error: "Enter a whole number" })
      .min(1, { error: "At least 1" })
      .max(REMINDER_LIMITS.count, {
        error: `At most ${REMINDER_LIMITS.count}`,
      }),
  }),
]);
export type ScheduleEnd = z.infer<typeof endSchema>;

// When a reminder happens, in Philippine time
export const scheduleSchema = z
  .object({
    // The first day
    start: dateText,
    // Times of day, like ["08:00", "20:00"]
    times: z
      .array(timeText)
      .min(1, { error: "Add a time" })
      .max(REMINDER_LIMITS.timesPerDay, {
        error: `At most ${REMINDER_LIMITS.timesPerDay} times a day`,
      })
      .transform((times) => [...new Set(times)].sort()),
    repeat: repeatSchema,
    end: endSchema,
  })
  .refine((s) => s.end.type !== "until" || s.end.date >= s.start, {
    error: "The last day can't be before the first",
    path: ["end", "date"],
  });
export type Schedule = z.infer<typeof scheduleSchema>;
