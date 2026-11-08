import { PLACE_LIMITS } from "@talaan/shared";
import { CheckboxField } from "../../ui/CheckboxField";
import { TextField } from "../../ui/TextField";

// New blank labels to name later, and reprinting ones not named yet
export function BlankLabelsPicker({
  count,
  onCount,
  unused,
  includeUnused,
  onIncludeUnused,
}: {
  count: number;
  onCount: (count: number) => void;
  // Blank labels made before and not named yet
  unused: number;
  includeUnused: boolean;
  onIncludeUnused: (on: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <TextField
        label="New blank labels"
        type="number"
        inputMode="numeric"
        min={0}
        max={PLACE_LIMITS.blankAtOnce}
        value={String(count)}
        onChange={(v) =>
          onCount(
            Math.min(
              PLACE_LIMITS.blankAtOnce,
              Math.max(0, Math.floor(Number(v) || 0)),
            ),
          )
        }
      />
      <p className="-mt-1 text-sm text-muted">
        Stick them on boxes and folders now, and name each one the first time
        you scan it. Up to {PLACE_LIMITS.blankAtOnce} at a time.
      </p>
      {unused > 0 && (
        <CheckboxField checked={includeUnused} onChange={onIncludeUnused}>
          Also print the {unused} blank {unused === 1 ? "label" : "labels"} not
          named yet
        </CheckboxField>
      )}
    </div>
  );
}
