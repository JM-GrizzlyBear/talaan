import {
  addDays,
  dayText,
  parseDay,
  type ReminderFieldsInput,
  type ReminderInfo,
  type ReminderKind,
  todayText,
} from "@talaan/shared";

export type RepeatChoice = "none" | "day" | "week" | "month" | "year";
// "days" and "supply" are ways to work out the end for medicine
export type EndChoice = "never" | "until" | "count" | "days" | "supply";

export interface ReminderFormState {
  kind: ReminderKind | "";
  title: string;
  dose: string;
  note: string;
  // "" for the account owner
  profileId: string;
  recordId: string;
  start: string;
  times: string[];
  repeat: RepeatChoice;
  interval: string;
  weekdays: number[];
  monthOn: "day" | "weekday";
  monthDay: string;
  // "1"…"4", or "-1" for the last
  monthWeek: string;
  monthWeekday: string;
  end: EndChoice;
  until: string;
  count: string;
  days: string;
  // "Until the bottle runs out": how many are left, and how many each time
  pills: string;
  perDose: string;
  alerts: number[];
}

const weekdayOf = (text: string) => new Date(`${text}T00:00:00Z`).getUTCDay();

export function emptyReminder(
  today: string,
  profileId = "",
  recordId = "",
): ReminderFormState {
  const start = parseDay(today);
  return {
    kind: "",
    title: "",
    dose: "",
    note: "",
    profileId,
    recordId,
    start: today,
    times: ["08:00"],
    repeat: "none",
    interval: "1",
    weekdays: [weekdayOf(today)],
    monthOn: "day",
    monthDay: String(start.day),
    monthWeek: String(Math.min(4, Math.ceil(start.day / 7))),
    monthWeekday: String(weekdayOf(today)),
    end: "never",
    until: "",
    count: "",
    days: "",
    pills: "",
    perDose: "1",
    alerts: [0],
  };
}

export const newReminderToday = (now = new Date()) => todayText(now);

// Sensible starting alerts for each kind (changed freely afterwards)
export const KIND_ALERTS: Record<ReminderKind, number[]> = {
  medicine: [0],
  checkup: [120, 1440],
  lab: [120, 1440],
  vaccination: [120, 1440],
  refill: [1440, 10080],
  hmo: [1440, 10080],
  other: [0],
};

export function formFromReminder(r: ReminderInfo): ReminderFormState {
  const s = r.schedule;
  const base = emptyReminder(s.start, r.profileId ?? "", r.recordId ?? "");
  const form: ReminderFormState = {
    ...base,
    kind: r.kind,
    title: r.title,
    dose: r.dose,
    note: r.note,
    times: s.times,
    repeat: s.repeat.every,
    alerts: r.alerts,
  };
  if (s.repeat.every !== "none") form.interval = String(s.repeat.interval);
  if (s.repeat.every === "week") form.weekdays = s.repeat.weekdays;
  if (s.repeat.every === "month") {
    if (s.repeat.on.type === "day") {
      form.monthOn = "day";
      form.monthDay = String(s.repeat.on.day);
    } else {
      form.monthOn = "weekday";
      form.monthWeek = String(s.repeat.on.week);
      form.monthWeekday = String(s.repeat.on.weekday);
    }
  }
  if (s.end.type === "until") {
    form.end = "until";
    form.until = s.end.date;
  }
  if (s.end.type === "count") {
    form.end = "count";
    form.count = String(s.end.count);
  }
  return form;
}

const whole = (text: string) =>
  /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;

// How many times "until the bottle runs out" makes
export function supplyCount(pills: string, perDose: string) {
  const left = whole(pills);
  const each = whole(perDose);
  if (!left || !each) return null;
  return Math.floor(left / each);
}

// The form → what the API takes, or messages for boxes that aren't numbers
export function reminderFieldsFromForm(form: ReminderFormState): {
  fields: ReminderFieldsInput | null;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const number = (key: string, text: string, label = "Enter a number") => {
    const value = whole(text);
    if (value === null || value < 1) errors[key] = label;
    return value ?? 1;
  };
  const interval =
    form.repeat === "none" ? 1 : number("interval", form.interval);

  let repeat: ReminderFieldsInput["schedule"]["repeat"];
  switch (form.repeat) {
    case "none":
      repeat = { every: "none" };
      break;
    case "day":
    case "year":
      repeat = { every: form.repeat, interval };
      break;
    case "week":
      repeat = { every: "week", interval, weekdays: form.weekdays };
      break;
    case "month":
      repeat = {
        every: "month",
        interval,
        on:
          form.monthOn === "day"
            ? { type: "day", day: number("monthDay", form.monthDay) }
            : {
                type: "weekday",
                week: Number(form.monthWeek) as 1 | 2 | 3 | 4 | -1,
                weekday: Number(form.monthWeekday),
              },
      };
      break;
  }

  let end: ReminderFieldsInput["schedule"]["end"] = { type: "never" };
  if (form.repeat !== "none") {
    if (form.end === "until") end = { type: "until", date: form.until };
    if (form.end === "count") {
      end = { type: "count", count: number("count", form.count) };
    }
    if (form.end === "days") {
      const days = number("days", form.days);
      end = {
        type: "until",
        date: dayText(addDays(parseDay(form.start), days - 1)),
      };
    }
    if (form.end === "supply") {
      const count = supplyCount(form.pills, form.perDose);
      if (count === null || count < 1) {
        errors.pills = "Enter how many are left, and how many each time";
      }
      end = { type: "count", count: count ?? 1 };
    }
  }

  if (Object.keys(errors).length > 0) return { fields: null, errors };
  return {
    fields: {
      kind: form.kind as ReminderKind,
      title: form.title,
      dose: form.kind === "medicine" ? form.dose : "",
      note: form.note,
      profileId: form.profileId || null,
      recordId: form.recordId || null,
      schedule: { start: form.start, times: form.times, repeat, end },
      alerts: form.alerts,
    },
    errors,
  };
}

// The API's names for the form's boxes ("schedule.end.count" → "count")
export const SERVER_FIELDS: Record<string, string> = {
  "schedule.start": "start",
  "schedule.times": "times",
  "schedule.repeat.interval": "interval",
  "schedule.repeat.weekdays": "weekdays",
  "schedule.repeat.on.day": "monthDay",
  "schedule.end.date": "until",
  "schedule.end.count": "count",
  schedule: "start",
};
