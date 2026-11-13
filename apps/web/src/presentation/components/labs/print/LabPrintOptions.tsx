import { CheckboxField } from "../../ui/CheckboxField";
import { SelectField } from "../../ui/SelectField";
import { PAPER_SIZES, type PaperSizeId } from "@talaan/client";
import type { LabPrintSettings } from "./labPrintSettings";

// Paper, portrait or landscape, what to include, how many dates
export function LabPrintOptions({
  settings,
  onChange,
}: {
  settings: LabPrintSettings;
  onChange: (settings: LabPrintSettings) => void;
}) {
  const set = <K extends keyof LabPrintSettings>(
    key: K,
    value: LabPrintSettings[K],
  ) => onChange({ ...settings, [key]: value });
  return (
    <div className="grid gap-4 rounded-xl border border-edge bg-white p-4 sm:grid-cols-2">
      <SelectField
        label="Paper"
        value={settings.paper}
        onChange={(v) => set("paper", v as PaperSizeId)}
        options={Object.entries(PAPER_SIZES).map(([value, p]) => ({
          value,
          label: p.name,
        }))}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Orientation</legend>
        <div className="flex gap-2">
          {(
            [
              ["portrait", "Portrait"],
              ["landscape", "Landscape"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 font-semibold ${
                settings.orientation === value
                  ? "border-brand bg-brand-soft text-deep"
                  : "border-edge bg-white hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="orientation"
                checked={settings.orientation === value}
                onChange={() => set("orientation", value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`inline-block border-2 border-current ${value === "portrait" ? "h-5 w-3.5" : "h-3.5 w-5"}`}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Include</legend>
        <CheckboxField
          checked={settings.attention}
          onChange={(v) => set("attention", v)}
        >
          Needs attention
        </CheckboxField>
        <CheckboxField
          checked={settings.table}
          onChange={(v) => set("table", v)}
        >
          Table of results
        </CheckboxField>
        <CheckboxField
          checked={settings.charts}
          onChange={(v) => set("charts", v)}
        >
          Charts
        </CheckboxField>
      </fieldset>
      <SelectField
        label="Dates in the table"
        value={String(settings.dates)}
        onChange={(v) => set("dates", Number(v))}
        options={[
          { value: "4", label: "The latest 4" },
          { value: "6", label: "The latest 6" },
          { value: "8", label: "The latest 8" },
          { value: "12", label: "The latest 12" },
          { value: "0", label: "All of them" },
        ]}
      />
    </div>
  );
}
