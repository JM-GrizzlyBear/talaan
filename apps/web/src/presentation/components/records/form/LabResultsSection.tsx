import { RECORD_LIMITS } from "@talaan/shared";
import { Plus } from "lucide-react";
import { buttonSecondary } from "../../ui/styles";
import { addToForm, emptyLabRow } from "@talaan/client";
import { FormSection } from "./FormSection";
import type { RowPartProps } from "./formParts";
import { LabResultRow } from "./LabResultRow";
import { ReadFromPrintout } from "./ReadFromPrintout";

// Lab results: one row per test, typed in or read from a photo or PDF
export function LabResultsSection({
  form,
  set,
  rowError,
  error,
  recordId,
  readFileId,
}: RowPartProps & {
  recordId?: string;
  readFileId?: string;
}) {
  const rows = form.results;

  return (
    <FormSection title="Results">
      <p className="-mt-2 text-sm text-muted">
        Copy each line from the printout, or let Talaan read a photo or PDF of
        it. The normal range is on the same line, like “12.0 – 16.0”.
      </p>
      <ReadFromPrintout
        recordId={recordId}
        readFileId={readFileId}
        onAdd={(read) => set("results", addToForm(rows, read))}
      />
      {rows.map((row, index) => (
        <LabResultRow
          key={index}
          row={row}
          index={index}
          onChange={(key, value) =>
            set(
              "results",
              rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)),
            )
          }
          onRemove={() =>
            set(
              "results",
              rows.length === 1
                ? [emptyLabRow()]
                : rows.filter((_, i) => i !== index),
            )
          }
          error={(key) => rowError("results", index, key)}
        />
      ))}
      {error("details.results") && (
        <p className="text-sm font-medium text-danger">
          {error("details.results")}
        </p>
      )}
      <button
        type="button"
        onClick={() => set("results", [...rows, emptyLabRow()])}
        disabled={rows.length >= RECORD_LIMITS.labRows}
        className={`${buttonSecondary} self-start`}
      >
        <Plus aria-hidden="true" className="size-4" />
        Add a test
      </button>
    </FormSection>
  );
}
