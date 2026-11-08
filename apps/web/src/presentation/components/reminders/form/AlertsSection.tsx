import { ALERT_PRESETS, describeAlert, REMINDER_LIMITS } from "@talaan/shared";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { FormSection } from "../../records/form/FormSection";
import { SelectField } from "../../ui/SelectField";
import { TextField } from "../../ui/TextField";
import { buttonSecondary } from "../../ui/styles";
import type { ReminderPartProps } from "./formParts";

const UNIT_MINUTES = { minutes: 1, hours: 60, days: 1440 } as const;
type Unit = keyof typeof UNIT_MINUTES;

// At the time, 30 minutes before, 1 day before… and your own
export function AlertsSection({ form, set, error }: ReminderPartProps) {
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<Unit>("hours");
  const [ownError, setOwnError] = useState<string>();
  const full = form.alerts.length >= REMINDER_LIMITS.alerts;

  const toggle = (minutes: number) =>
    set(
      "alerts",
      form.alerts.includes(minutes)
        ? form.alerts.filter((m) => m !== minutes)
        : [...form.alerts, minutes].sort((a, b) => a - b),
    );

  function addOwn() {
    const n = Number(amount);
    const minutes = n * UNIT_MINUTES[unit];
    if (!Number.isInteger(n) || n < 1) {
      setOwnError("Enter a whole number");
      return;
    }
    if (minutes > REMINDER_LIMITS.alertMinutes) {
      setOwnError("At most 30 days before");
      return;
    }
    setOwnError(undefined);
    setAmount("");
    if (!form.alerts.includes(minutes)) {
      set(
        "alerts",
        [...form.alerts, minutes].sort((a, b) => a - b),
      );
    }
  }

  const own = form.alerts.filter(
    (m) => !(ALERT_PRESETS as readonly number[]).includes(m),
  );

  return (
    <FormSection title="Alerts">
      <p className="-mt-2 text-sm text-muted">
        By email and browser notification, to you and the family it's shared
        with. Each person can turn them off for themselves. Up to{" "}
        {REMINDER_LIMITS.alerts}.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ALERT_PRESETS.map((minutes) => (
          <label key={minutes} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.alerts.includes(minutes)}
              disabled={full && !form.alerts.includes(minutes)}
              onChange={() => toggle(minutes)}
              className="size-4 accent-brand"
            />
            {describeAlert(minutes)}
          </label>
        ))}
      </div>
      {own.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {own.map((minutes) => (
            <li
              key={minutes}
              className="flex items-center gap-1 rounded-full bg-brand-soft py-1 pr-1 pl-3 text-sm font-semibold text-deep"
            >
              {describeAlert(minutes)}
              <button
                type="button"
                onClick={() => toggle(minutes)}
                aria-label={`Remove ${describeAlert(minutes)}`}
                className="cursor-pointer rounded-full p-1 hover:bg-white"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-24">
          <TextField
            label="Your own"
            type="number"
            inputMode="numeric"
            min={1}
            value={amount}
            onChange={setAmount}
            disabled={full}
            error={ownError}
          />
        </div>
        <div className="w-32">
          <SelectField
            label="Unit"
            value={unit}
            onChange={(v) => setUnit(v as Unit)}
            options={[
              { value: "minutes", label: "minutes" },
              { value: "hours", label: "hours" },
              { value: "days", label: "days" },
            ]}
          />
        </div>
        <button
          type="button"
          onClick={addOwn}
          disabled={full || !amount}
          className={buttonSecondary}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add
        </button>
      </div>
      {form.alerts.length === 0 && (
        <p className="text-sm font-medium text-warn">
          No alerts: it only shows in Talaan.
        </p>
      )}
      {error("alerts") && (
        <p className="text-sm font-medium text-danger">{error("alerts")}</p>
      )}
    </FormSection>
  );
}
