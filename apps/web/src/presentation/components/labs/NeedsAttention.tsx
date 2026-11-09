import { formatRange, needsAttention, type LabSeries } from "@talaan/shared";
import { CircleCheck } from "lucide-react";
import { dateLabel } from "./chartScale";
import { LabChart } from "./LabChart";
import { ResultCell } from "./ResultCell";
import { TrendArrow } from "./TrendArrow";

// How many results in a row (ending with the latest) are out of range
const outInARow = (s: LabSeries) => {
  let count = 0;
  for (let i = s.points.length - 1; i >= 0 && s.points[i].flag; i--) count++;
  return count;
};

// Tests whose latest result is outside the normal range, furthest out first
export function NeedsAttention({
  series,
  onTest,
}: {
  series: LabSeries[];
  onTest?: (key: string) => void;
}) {
  const list = needsAttention(series);
  if (list.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-edge bg-white p-4 font-semibold text-deep">
        <CircleCheck aria-hidden="true" className="size-5 text-brand" />
        Every latest result is within its normal range.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Talaan compares each result with the range printed on it. Only a doctor
        can say what a result means for you.
      </p>
      <ul className="flex flex-col gap-3">
        {list.map((s) => {
          const latest = s.points.at(-1)!;
          const row = outInARow(s);
          return (
            <li
              key={s.key}
              className="flex flex-col gap-2 rounded-xl border border-danger/30 bg-white p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  {onTest && s.numeric ? (
                    <button
                      type="button"
                      onClick={() => onTest(s.key)}
                      className="cursor-pointer font-semibold text-brand underline-offset-2 hover:underline"
                    >
                      {s.name}
                    </button>
                  ) : (
                    <span className="font-semibold">{s.name}</span>
                  )}
                  <ResultCell point={latest} unit={s.unit} />
                  <span className="text-sm">{s.unit}</span>
                  <TrendArrow point={latest} previous={s.points.at(-2)} />
                </span>
                <span className="text-sm text-muted">
                  {formatRange(latest) && `Normal ${formatRange(latest)} · `}
                  {dateLabel(latest.date)}
                  {row > 1 && ` · out of range ${row} times in a row`}
                </span>
              </div>
              {s.numeric && s.points.length > 1 && (
                <div className="sm:w-56">
                  <LabChart series={s} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
