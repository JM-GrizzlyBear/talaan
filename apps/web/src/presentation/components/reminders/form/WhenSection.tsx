import { REMINDER_LIMITS } from "@talaan/shared";
import { Plus, X } from "lucide-react";
import { FormSection } from "../../records/form/FormSection";
import { TextField } from "../../ui/TextField";
import { buttonSecondary, linkButton } from "../../ui/styles";
import type { ReminderPartProps } from "./formParts";

// Common medicine times, one tap each
const PRESETS = [
  { label: "Once a day", times: ["08:00"] },
  { label: "Twice a day", times: ["08:00", "20:00"] },
  { label: "3 times a day", times: ["08:00", "13:00", "20:00"] },
  { label: "4 times a day", times: ["06:00", "12:00", "18:00", "22:00"] },
];

// The first day and the times of day
export function WhenSection({ form, set, error }: ReminderPartProps) {
  const setTime = (index: number, value: string) =>
    set(
      "times",
      form.times.map((t, i) => (i === index ? value : t)),
    );
  return (
    <FormSection title="When">
      <TextField
        label={form.repeat === "none" ? "Date" : "First day"}
        type="date"
        value={form.start}
        onChange={(v) => set("start", v)}
        error={error("start")}
      />
      {form.kind === "medicine" && (
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => set("times", preset.times)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                form.times.join() === preset.times.join()
                  ? "border-brand bg-brand-soft text-deep"
                  : "border-edge bg-white hover:bg-gray-50"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {form.times.map((time, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                label={form.times.length > 1 ? `Time ${index + 1}` : "Time"}
                type="time"
                value={time}
                onChange={(v) => setTime(index, v)}
              />
            </div>
            {form.times.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  set(
                    "times",
                    form.times.filter((_, i) => i !== index),
                  )
                }
                aria-label={`Remove time ${index + 1}`}
                className={`${linkButton} mb-3`}
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            )}
          </div>
        ))}
        {error("times") && (
          <p className="text-sm font-medium text-danger">{error("times")}</p>
        )}
        <button
          type="button"
          onClick={() => set("times", [...form.times, "12:00"])}
          disabled={form.times.length >= REMINDER_LIMITS.timesPerDay}
          className={`${buttonSecondary} self-start`}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add a time
        </button>
      </div>
      <p className="text-sm text-muted">Times are in Philippine time.</p>
    </FormSection>
  );
}
