import { RECORD_TYPE_LABELS, RECORD_TYPES } from "@talaan/shared";
import { TriangleAlert } from "lucide-react";
import {
  DETAIL_LABELS,
  type DetailCheck,
  needsCheck,
  shown,
} from "@talaan/client";

const box =
  "w-full rounded-lg border border-edge bg-white px-2.5 text-base text-gray-900";

// One box read from the paper: ticked to use, editable, "Please check" in amber
export function DetailCheckCard({
  check,
  onChange,
}: {
  check: DetailCheck;
  onChange: (patch: Partial<DetailCheck>) => void;
}) {
  const unsure = needsCheck(check.doubts);
  const label = DETAIL_LABELS[check.key];
  const look = !check.include
    ? "border-edge bg-page"
    : unsure
      ? "border-warn-edge bg-warn-soft"
      : "border-edge bg-white";

  const input =
    check.key === "type" ? (
      <select
        value={check.value}
        onChange={(e) => onChange({ value: e.target.value })}
        aria-label={label}
        className={`${box} h-10`}
      >
        {RECORD_TYPES.map((t) => (
          <option key={t} value={t}>
            {RECORD_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
    ) : check.key === "reading" ? (
      <textarea
        value={check.value}
        onChange={(e) => onChange({ value: e.target.value })}
        aria-label={label}
        rows={4}
        className={`${box} py-2`}
      />
    ) : (
      <input
        type={check.key === "recordDate" ? "date" : "text"}
        inputMode={
          ["totalAmount", "hmoCovered", "youPaid"].includes(check.key)
            ? "decimal"
            : undefined
        }
        value={check.value}
        onChange={(e) => onChange({ value: e.target.value })}
        aria-label={label}
        className={`${box} h-10`}
      />
    );

  return (
    <li className={`flex flex-col gap-2 rounded-lg border p-3 ${look}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={check.include}
            onChange={(e) => onChange({ include: e.target.checked })}
            className="size-4 cursor-pointer accent-brand"
          />
          {label}
        </label>
        {unsure && check.include && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
            Please check
          </span>
        )}
      </div>
      {input}
      {unsure && (
        <ul className="flex flex-col gap-0.5 text-sm text-warn">
          {check.doubts.map((doubt) => (
            <li key={doubt} className="flex items-start gap-1.5">
              <TriangleAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              {doubt}
            </li>
          ))}
        </ul>
      )}
      {check.current && (
        <p className="text-sm text-muted">
          The form has “{shown(check.key, check.current)}”.{" "}
          {check.include
            ? "This will replace it."
            : "Tick to use this instead."}
        </p>
      )}
      {check.line && check.key !== "reading" && (
        <p className="truncate text-xs text-muted" title={check.line}>
          From: {check.line}
        </p>
      )}
    </li>
  );
}
