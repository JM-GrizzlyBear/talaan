import { labFlag, RECORD_LIMITS } from "@talaan/shared";
import { Plus } from "lucide-react";
import { TextField } from "../../ui/TextField";
import { buttonSecondary, linkButton } from "../../ui/styles";
import { FormSection } from "./FormSection";
import type { RowPartProps } from "./formParts";
import { emptyLabRow, parseNumber } from "./recordFormState";

// Lab results: one row per test, with its normal range and a Low/High flag
export function LabResultsSection({
  form,
  set,
  rowError,
  error,
}: RowPartProps) {
  return (
    <FormSection title="Results">
      <p className="-mt-2 text-sm text-muted">
        Copy each line from the printout. The normal range is on the same line,
        like “12.0 – 16.0”.
      </p>
      {form.results.map((row, index) => {
        const change = (key: keyof typeof row, value: string) =>
          set(
            "results",
            form.results.map((r, i) =>
              i === index ? { ...r, [key]: value } : r,
            ),
          );
        const low = parseNumber(row.rangeLow);
        const high = parseNumber(row.rangeHigh);
        const flag =
          low !== undefined && high !== undefined
            ? labFlag({
                value: row.value,
                rangeLow: low,
                rangeHigh: high,
              })
            : null;
        return (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-lg border border-edge p-3"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <div className="col-span-2 sm:col-span-1">
                <TextField
                  label={`Test ${index + 1}`}
                  value={row.name}
                  onChange={(v) => change("name", v)}
                  placeholder={index === 0 ? "Hemoglobin" : undefined}
                  maxLength={80}
                  error={rowError("results", index, "name")}
                />
              </div>
              <TextField
                label="Result"
                value={row.value}
                onChange={(v) => change("value", v)}
                placeholder={index === 0 ? "13.5" : undefined}
                maxLength={30}
                error={rowError("results", index, "value")}
              />
              <TextField
                label="Unit"
                value={row.unit}
                onChange={(v) => change("unit", v)}
                placeholder={index === 0 ? "g/dL" : undefined}
                maxLength={20}
                error={rowError("results", index, "unit")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
              <TextField
                label="Normal from"
                value={row.rangeLow}
                onChange={(v) => change("rangeLow", v)}
                inputMode="decimal"
                placeholder={index === 0 ? "12.0" : undefined}
                error={rowError("results", index, "rangeLow")}
              />
              <TextField
                label="Normal to"
                value={row.rangeHigh}
                onChange={(v) => change("rangeHigh", v)}
                inputMode="decimal"
                placeholder={index === 0 ? "16.0" : undefined}
                error={rowError("results", index, "rangeHigh")}
              />
              <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:mt-7 sm:h-11">
                {flag ? (
                  <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">
                    {flag === "low" ? "Low" : "High"}
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "results",
                      form.results.length === 1
                        ? [emptyLabRow()]
                        : form.results.filter((_, i) => i !== index),
                    )
                  }
                  aria-label={`Remove test ${index + 1}`}
                  className={linkButton}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {error("details.results") && (
        <p className="text-sm font-medium text-danger">
          {error("details.results")}
        </p>
      )}
      <button
        type="button"
        onClick={() => set("results", [...form.results, emptyLabRow()])}
        disabled={form.results.length >= RECORD_LIMITS.labRows}
        className={`${buttonSecondary} self-start`}
      >
        <Plus aria-hidden="true" className="size-4" />
        Add a test
      </button>
    </FormSection>
  );
}
