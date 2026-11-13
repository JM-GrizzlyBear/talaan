import type { LabRecordResults, LabSeries } from "@talaan/shared";
import { roundLab } from "@talaan/shared";
import { useState } from "react";
import { SelectField } from "../ui/SelectField";
import { dateLabel } from "@talaan/client";
import { ResultCell } from "./ResultCell";

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

// Two lab dates side by side, with the change for each test
export function CompareDates({
  series,
  columns,
}: {
  series: LabSeries[];
  // Newest first
  columns: LabRecordResults[];
}) {
  const [before, setBefore] = useState(columns[1]?.recordId ?? "");
  const [after, setAfter] = useState(columns[0]?.recordId ?? "");
  if (columns.length < 2) {
    return (
      <p className="text-sm text-muted">
        Comparing needs at least two lab records for this person.
      </p>
    );
  }
  const options = columns.map((c) => ({
    value: c.recordId,
    label: `${dateLabel(c.date)}${c.facility ? ` · ${c.facility}` : ""}`,
  }));
  const rows = series
    .map((s) => ({
      s,
      a: s.points.find((p) => p.recordId === before),
      b: s.points.find((p) => p.recordId === after),
    }))
    .filter((r) => r.a || r.b);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Before"
          value={before}
          onChange={setBefore}
          options={options}
        />
        <SelectField
          label="After"
          value={after}
          onChange={setAfter}
          options={options}
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-edge bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-edge text-left">
              <th scope="col" className="px-3 py-2">
                Test
              </th>
              <th scope="col" className="px-3 py-2">
                Before
              </th>
              <th scope="col" className="px-3 py-2">
                After
              </th>
              <th scope="col" className="px-3 py-2">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, a, b }) => {
              const change =
                a?.value != null &&
                b?.value != null &&
                !a.otherUnit &&
                !b.otherUnit
                  ? roundLab(b.value - a.value)
                  : null;
              const percent =
                change !== null && a?.value
                  ? Math.round((change / a.value) * 1000) / 10
                  : null;
              const note =
                a && b && !a.flag && b.flag
                  ? `Now ${b.flag}`
                  : a && b && a.flag && !b.flag
                    ? "Back to normal"
                    : "";
              return (
                <tr key={s.key} className="border-b border-edge last:border-0">
                  <th scope="row" className="px-3 py-2 text-left font-semibold">
                    {s.name}
                    {s.unit && (
                      <span className="block text-xs font-normal text-muted">
                        {s.unit}
                      </span>
                    )}
                  </th>
                  <td className="px-3 py-2">
                    {a ? <ResultCell point={a} unit={s.unit} /> : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {b ? <ResultCell point={b} unit={s.unit} /> : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {change === null
                      ? "—"
                      : `${signed(change)}${percent !== null ? ` (${signed(percent)}%)` : ""}`}
                    {note && (
                      <span
                        className={`block text-xs font-semibold ${note === "Back to normal" ? "text-brand" : "text-danger"}`}
                      >
                        {note}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
