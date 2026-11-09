import {
  formatRange,
  type LabRecordResults,
  type LabSeries,
} from "@talaan/shared";
import { Link } from "react-router";
import { dateLabel } from "./chartScale";
import { ResultCell } from "./ResultCell";
import { TrendArrow } from "./TrendArrow";

// Tests down the side, lab dates across (newest first). The test names stay
// in place while the dates scroll sideways.
export function LabTable({
  series,
  columns,
  highlight,
  onTest,
  print = false,
}: {
  series: LabSeries[];
  columns: LabRecordResults[];
  // A record's column to mark (the one opened from)
  highlight?: string;
  onTest?: (key: string) => void;
  print?: boolean;
}) {
  return (
    <div
      className={
        print ? "" : "overflow-x-auto rounded-xl border border-edge bg-white"
      }
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-edge">
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-36 bg-white px-3 py-2 text-left font-semibold"
            >
              Test
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-left font-semibold text-muted"
            >
              Normal
            </th>
            {columns.map((c) => (
              <th
                key={c.recordId}
                scope="col"
                className={`px-3 py-2 text-left align-bottom whitespace-nowrap ${
                  highlight === c.recordId ? "bg-brand-soft" : ""
                }`}
              >
                {print ? (
                  <span className="font-semibold">{dateLabel(c.date)}</span>
                ) : (
                  <Link
                    to={`/records/${c.recordId}`}
                    className="font-semibold text-brand underline-offset-2 hover:underline"
                  >
                    {dateLabel(c.date)}
                  </Link>
                )}
                {c.facility && (
                  <span className="block max-w-36 truncate text-xs font-normal text-muted">
                    {c.facility}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((s, i) => {
            // A group's heading before its first test
            const header = i === 0 || series[i - 1].group !== s.group;
            const byRecord = new Map(s.points.map((p, i) => [p.recordId, i]));
            const latest = s.points.at(-1);
            return [
              header && (
                <tr key={`${s.group}-group`} className="bg-page">
                  <th
                    colSpan={columns.length + 2}
                    scope="colgroup"
                    className="sticky left-0 px-3 py-1.5 text-left text-xs font-bold tracking-wide text-muted uppercase"
                  >
                    {s.group}
                  </th>
                </tr>
              ),
              <tr key={s.key} className="border-b border-edge last:border-0">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-semibold"
                >
                  {onTest && s.numeric ? (
                    <button
                      type="button"
                      onClick={() => onTest(s.key)}
                      className="cursor-pointer text-left text-brand underline-offset-2 hover:underline"
                    >
                      {s.name}
                    </button>
                  ) : (
                    s.name
                  )}
                  {s.unit && (
                    <span className="block text-xs font-normal text-muted">
                      {s.unit}
                    </span>
                  )}
                </th>
                <td className="px-3 py-2 whitespace-nowrap text-muted tabular-nums">
                  {latest ? formatRange(latest) : ""}
                </td>
                {columns.map((c) => {
                  const index = byRecord.get(c.recordId);
                  const point =
                    index === undefined ? undefined : s.points[index];
                  return (
                    <td
                      key={c.recordId}
                      className={`px-3 py-2 whitespace-nowrap ${
                        highlight === c.recordId ? "bg-brand-soft/60" : ""
                      }`}
                    >
                      {point ? (
                        <span className="inline-flex items-center gap-1">
                          <ResultCell point={point} unit={s.unit} />
                          <TrendArrow
                            point={point}
                            previous={index ? s.points[index - 1] : undefined}
                          />
                        </span>
                      ) : (
                        <span className="text-gray-300" aria-label="Not done">
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
