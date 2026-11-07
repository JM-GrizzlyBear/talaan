import { TextField } from "../../ui/TextField";
import { linkButton } from "../../ui/styles";
import { LabFlagBadge } from "../LabFlagBadge";
import { labRowFlag } from "./labRowFlag";
import type { LabRow } from "./recordFormState";

// One test on the form: name, result, unit, normal range, Low/High
export function LabResultRow({
  row,
  index,
  onChange,
  onRemove,
  error,
}: {
  row: LabRow;
  index: number;
  onChange: (key: keyof LabRow, value: string) => void;
  onRemove: () => void;
  error: (key: keyof LabRow) => string | undefined;
}) {
  // Examples only in the first row
  const example = (text: string) => (index === 0 ? text : undefined);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-edge p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="col-span-2 sm:col-span-1">
          <TextField
            label={`Test ${index + 1}`}
            value={row.name}
            onChange={(v) => onChange("name", v)}
            placeholder={example("Hemoglobin")}
            maxLength={80}
            error={error("name")}
          />
        </div>
        <TextField
          label="Result"
          value={row.value}
          onChange={(v) => onChange("value", v)}
          placeholder={example("13.5")}
          maxLength={30}
          error={error("value")}
        />
        <TextField
          label="Unit"
          value={row.unit}
          onChange={(v) => onChange("unit", v)}
          placeholder={example("g/dL")}
          maxLength={20}
          error={error("unit")}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <TextField
          label="Normal from"
          value={row.rangeLow}
          onChange={(v) => onChange("rangeLow", v)}
          inputMode="decimal"
          placeholder={example("12.0")}
          error={error("rangeLow")}
        />
        <TextField
          label="Normal to"
          value={row.rangeHigh}
          onChange={(v) => onChange("rangeHigh", v)}
          inputMode="decimal"
          placeholder={example("16.0")}
          error={error("rangeHigh")}
        />
        <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:mt-7 sm:h-11">
          <LabFlagBadge flag={labRowFlag(row)} />
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove test ${index + 1}`}
            className={`${linkButton} ml-auto`}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
