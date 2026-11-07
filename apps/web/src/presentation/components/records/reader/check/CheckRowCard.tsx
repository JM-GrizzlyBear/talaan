import { TriangleAlert } from "lucide-react";
import { LabFlagBadge } from "../../LabFlagBadge";
import { labRowFlag } from "../../form/labRowFlag";
import type { CheckRow } from "./checkRows";

type Box = "name" | "value" | "unit" | "rangeLow" | "rangeHigh";

const box =
  "h-10 w-full rounded-lg border border-edge bg-white px-2.5 text-base text-gray-900";

// One read row: ticked to add, every box can be fixed, doubts in amber
export function CheckRowCard({
  row,
  index,
  onChange,
}: {
  row: CheckRow;
  index: number;
  onChange: (patch: Partial<CheckRow>) => void;
}) {
  const unsure = row.doubts.length > 0;
  const look = !row.include
    ? "border-edge bg-page opacity-60"
    : unsure
      ? "border-warn-edge bg-warn-soft"
      : "border-edge bg-white";

  const field = (key: Box, label: string, extra = "") => (
    <label
      className={`flex flex-col gap-0.5 text-xs font-semibold text-muted ${extra}`}
    >
      {label}
      <input
        value={row[key]}
        onChange={(event) => onChange({ [key]: event.target.value })}
        inputMode={key.startsWith("range") ? "decimal" : undefined}
        aria-label={`${label}, row ${index + 1}`}
        className={box}
      />
    </label>
  );

  return (
    <li className={`flex flex-col gap-2 rounded-lg border p-3 ${look}`}>
      <div className="flex items-start justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={row.include}
            onChange={(event) => onChange({ include: event.target.checked })}
            className="size-4 cursor-pointer accent-brand"
          />
          Add this result
        </label>
        <LabFlagBadge flag={labRowFlag(row)} />
      </div>
      {unsure && (
        <p className="flex items-start gap-1.5 text-sm text-warn">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          {row.doubts.join(". ")}.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr]">
        {field("name", "Test", "col-span-2 sm:col-span-1")}
        {field("value", "Result")}
        {field("unit", "Unit")}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {field("rangeLow", "Normal from")}
        {field("rangeHigh", "Normal to")}
      </div>
      <p className="text-xs break-words text-muted">Read as: “{row.line}”</p>
    </li>
  );
}
