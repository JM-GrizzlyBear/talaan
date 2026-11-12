import { TriangleAlert } from "lucide-react";
import type { MedicineCheck } from "./detailChecks";

const box =
  "h-10 w-full rounded-lg border border-edge bg-white px-2.5 text-base text-gray-900";

// One medicine read from a prescription
export function MedicineCheckCard({
  medicine,
  index,
  onChange,
}: {
  medicine: MedicineCheck;
  index: number;
  onChange: (patch: Partial<MedicineCheck>) => void;
}) {
  const unsure = medicine.doubts.length > 0;
  const look = !medicine.include
    ? "border-edge bg-page"
    : unsure
      ? "border-warn-edge bg-warn-soft"
      : "border-edge bg-white";
  const field = (key: "name" | "dose" | "frequency", label: string) => (
    <label className="flex flex-col gap-0.5 text-xs font-semibold text-muted">
      {label}
      <input
        value={medicine[key]}
        onChange={(e) => onChange({ [key]: e.target.value })}
        aria-label={`${label}, medicine ${index + 1}`}
        className={box}
      />
    </label>
  );
  return (
    <li className={`flex flex-col gap-2 rounded-lg border p-3 ${look}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={medicine.include}
            onChange={(e) => onChange({ include: e.target.checked })}
            className="size-4 cursor-pointer accent-brand"
          />
          Medicine {index + 1}
        </label>
        {unsure && medicine.include && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
            Please check
          </span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {field("name", "Medicine")}
        {field("dose", "Dose")}
        {field("frequency", "How often")}
      </div>
      {unsure &&
        medicine.doubts.map((doubt) => (
          <p key={doubt} className="flex items-start gap-1.5 text-sm text-warn">
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            {doubt}
          </p>
        ))}
      <p className="truncate text-xs text-muted" title={medicine.line}>
        From: {medicine.line}
      </p>
    </li>
  );
}
