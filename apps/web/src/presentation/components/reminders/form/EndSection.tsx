import { FormSection } from "../../records/form/FormSection";
import { TextField } from "../../ui/TextField";
import type { ReminderPartProps } from "./formParts";
import { type EndChoice, supplyCount } from "./reminderFormState";

// When a repeating reminder stops
export function EndSection({ form, set, error }: ReminderPartProps) {
  const option = (value: EndChoice, label: string) => (
    <label className="flex items-center gap-2">
      <input
        type="radio"
        name="end"
        checked={form.end === value}
        onChange={() => set("end", value)}
        className="size-4 accent-brand"
      />
      {label}
    </label>
  );
  const doses = supplyCount(form.pills, form.perDose);

  return (
    <FormSection title="Ends">
      {option("never", "Never")}
      {option("until", "On a date")}
      {form.end === "until" && (
        <div className="ml-6">
          <TextField
            label="Last day"
            type="date"
            min={form.start}
            value={form.until}
            onChange={(v) => set("until", v)}
            error={error("until")}
          />
        </div>
      )}
      {option("days", "After a number of days")}
      {form.end === "days" && (
        <div className="ml-6 w-40">
          <TextField
            label="For how many days"
            type="number"
            inputMode="numeric"
            min={1}
            value={form.days}
            onChange={(v) => set("days", v)}
            placeholder="7"
            error={error("days")}
          />
        </div>
      )}
      {option("count", "After a number of times")}
      {form.end === "count" && (
        <div className="ml-6 w-40">
          <TextField
            label="How many times"
            type="number"
            inputMode="numeric"
            min={1}
            value={form.count}
            onChange={(v) => set("count", v)}
            error={error("count")}
          />
        </div>
      )}
      {form.kind === "medicine" && (
        <>
          {option("supply", "When the medicine runs out")}
          {form.end === "supply" && (
            <div className="ml-6 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  label="How many are left"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.pills}
                  onChange={(v) => set("pills", v)}
                  placeholder="30"
                  error={error("pills")}
                />
                <TextField
                  label="How many each time"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.perDose}
                  onChange={(v) => set("perDose", v)}
                />
              </div>
              {doses !== null && (
                <p className="text-sm text-muted">
                  That's {doses} {doses === 1 ? "time" : "times"}.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </FormSection>
  );
}
