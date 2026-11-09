import { FormSection } from "../../records/form/FormSection";
import { SelectField } from "../../ui/SelectField";
import { TextField } from "../../ui/TextField";
import type { ReminderPartProps } from "./formParts";
import type { RepeatChoice } from "./reminderFormState";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const UNITS: Record<Exclude<RepeatChoice, "none">, [string, string]> = {
  day: ["day", "days"],
  week: ["week", "weeks"],
  month: ["month", "months"],
  year: ["year", "years"],
};

// Every few days, chosen weekdays, a day of the month…
export function RepeatSection({ form, set, error }: ReminderPartProps) {
  const toggleDay = (day: number) =>
    set(
      "weekdays",
      form.weekdays.includes(day)
        ? form.weekdays.filter((d) => d !== day)
        : [...form.weekdays, day].sort(),
    );

  return (
    <FormSection title="Repeat">
      <SelectField
        label="Repeats"
        value={form.repeat}
        onChange={(v) => set("repeat", v as RepeatChoice)}
        options={[
          { value: "none", label: "Doesn't repeat" },
          { value: "day", label: "Daily, or every few days" },
          { value: "week", label: "Weekly, on chosen days" },
          { value: "month", label: "Monthly" },
          { value: "year", label: "Yearly" },
        ]}
      />
      {form.repeat !== "none" && (
        <div className="flex items-end gap-2">
          <span className="mb-3 text-sm font-semibold">Every</span>
          <div className="w-24">
            <TextField
              label={`How many ${UNITS[form.repeat][1]}`}
              type="number"
              inputMode="numeric"
              min={1}
              value={form.interval}
              onChange={(v) => set("interval", v)}
              error={error("interval")}
            />
          </div>
          <span className="mb-3 text-sm font-semibold">
            {form.interval === "1"
              ? UNITS[form.repeat][0]
              : UNITS[form.repeat][1]}
          </span>
        </div>
      )}
      {form.repeat === "week" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">On</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((name, day) => (
              <label
                key={name}
                className={`flex size-12 cursor-pointer items-center justify-center rounded-full border text-sm font-semibold ${
                  form.weekdays.includes(day)
                    ? "border-brand bg-brand text-white"
                    : "border-edge bg-white hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.weekdays.includes(day)}
                  onChange={() => toggleDay(day)}
                  aria-label={WEEKDAY_NAMES[day]}
                  className="sr-only"
                />
                {name}
              </label>
            ))}
          </div>
          {error("weekdays") && (
            <p className="text-sm font-medium text-danger">
              {error("weekdays")}
            </p>
          )}
        </fieldset>
      )}
      {form.repeat === "month" && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-semibold">On</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={form.monthOn === "day"}
              onChange={() => set("monthOn", "day")}
              className="size-4 accent-brand"
            />
            A day of the month
          </label>
          {form.monthOn === "day" && (
            <div className="ml-6 w-32">
              <TextField
                label="Day (1–31)"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={form.monthDay}
                onChange={(v) => set("monthDay", v)}
                error={error("monthDay")}
              />
              <p className="mt-1 text-xs text-muted">
                29–31: the last day in shorter months
              </p>
            </div>
          )}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={form.monthOn === "weekday"}
              onChange={() => set("monthOn", "weekday")}
              className="size-4 accent-brand"
            />
            A weekday of the month
          </label>
          {form.monthOn === "weekday" && (
            <div className="ml-6 grid grid-cols-2 gap-2">
              <SelectField
                label="Which"
                value={form.monthWeek}
                onChange={(v) => set("monthWeek", v)}
                options={[
                  { value: "1", label: "1st" },
                  { value: "2", label: "2nd" },
                  { value: "3", label: "3rd" },
                  { value: "4", label: "4th" },
                  { value: "-1", label: "Last" },
                ]}
              />
              <SelectField
                label="Day"
                value={form.monthWeekday}
                onChange={(v) => set("monthWeekday", v)}
                options={WEEKDAY_NAMES.map((name, i) => ({
                  value: String(i),
                  label: name,
                }))}
              />
            </div>
          )}
        </fieldset>
      )}
    </FormSection>
  );
}
