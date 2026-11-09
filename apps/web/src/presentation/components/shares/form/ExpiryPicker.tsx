import {
  DURATION_UNITS,
  type DurationUnit,
  SHARE_DURATIONS,
} from "@talaan/shared";
import { useId } from "react";
import { inputBase } from "../../ui/styles";
import { type Expiry, expiryDate, localInputValue } from "./expiry";

const chip = (on: boolean) =>
  `min-h-11 cursor-pointer rounded-lg border px-3 text-sm font-semibold ${
    on
      ? "border-brand bg-brand-soft text-deep"
      : "border-edge bg-white hover:bg-gray-50"
  }`;

const endText = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

// How long the link lasts: 1 hour to 30 days with one tap, any number of
// hours/days/weeks, or until a date and time
export function ExpiryPicker({
  value,
  onChange,
  now,
}: {
  value: Expiry;
  onChange: (value: Expiry) => void;
  now: Date;
}) {
  const id = useId();
  const result = expiryDate(value, now);
  const isPreset = (key: string) =>
    value.mode === "preset" && value.key === key;

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      className="flex flex-col gap-3"
    >
      <span id={`${id}-label`} className="text-sm font-semibold">
        How long it works
      </span>
      <div className="flex flex-wrap gap-2">
        {SHARE_DURATIONS.map((d) => (
          <button
            key={d.key}
            type="button"
            aria-pressed={isPreset(d.key)}
            onClick={() => onChange({ mode: "preset", key: d.key })}
            className={chip(isPreset(d.key))}
          >
            {d.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={value.mode === "length"}
          onClick={() =>
            onChange({ mode: "length", amount: "3", unit: "days" })
          }
          className={chip(value.mode === "length")}
        >
          Other length
        </button>
        <button
          type="button"
          aria-pressed={value.mode === "date"}
          onClick={() =>
            onChange({
              mode: "date",
              value: localInputValue(
                new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
              ),
            })
          }
          className={chip(value.mode === "date")}
        >
          Until a date
        </button>
      </div>

      {value.mode === "length" && (
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Number
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={value.amount}
              onChange={(e) => onChange({ ...value, amount: e.target.value })}
              className={`${inputBase} min-h-11 max-w-24 border-edge`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            <span className="sr-only">Hours, days or weeks</span>
            <select
              value={value.unit}
              onChange={(e) =>
                onChange({ ...value, unit: e.target.value as DurationUnit })
              }
              className={`${inputBase} min-h-11 border-edge`}
            >
              {Object.entries(DURATION_UNITS).map(([key, unit]) => (
                <option key={key} value={key}>
                  {unit.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {value.mode === "date" && (
        <label className="flex flex-col gap-1.5 text-sm font-semibold sm:max-w-xs">
          Ends on
          <input
            type="datetime-local"
            value={value.value}
            min={localInputValue(now)}
            onChange={(e) => onChange({ mode: "date", value: e.target.value })}
            className={`${inputBase} min-h-11 border-edge`}
          />
        </label>
      )}

      <p
        aria-live="polite"
        className={`text-sm ${"error" in result ? "font-medium text-danger" : "text-muted"}`}
      >
        {"error" in result
          ? result.error
          : `Stops working ${endText(result.at)}. You can stop it sooner.`}
      </p>
    </div>
  );
}
