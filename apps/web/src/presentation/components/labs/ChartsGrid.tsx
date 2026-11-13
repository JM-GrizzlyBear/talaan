import { formatRange, type LabSeries } from "@talaan/shared";
import { dateLabel } from "@talaan/client";
import { LabChart } from "./LabChart";
import { ResultCell } from "./ResultCell";
import { TrendArrow } from "./TrendArrow";

// A small chart for every test that has numbers
export function ChartsGrid({
  series,
  onTest,
  highlight,
  print = false,
}: {
  series: LabSeries[];
  onTest?: (key: string) => void;
  highlight?: string;
  print?: boolean;
}) {
  const charted = series.filter((s) => s.numeric);
  if (charted.length === 0) {
    return (
      <p className="text-sm text-muted">
        No results with numbers to chart. Word results like “Negative” are in
        the table.
      </p>
    );
  }
  return (
    <ul
      className={`grid gap-3 ${print ? "grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}
    >
      {charted.map((s) => {
        const latest = s.points.at(-1)!;
        const card = (
          <>
            <span className="flex items-start justify-between gap-2">
              <span className="font-semibold">{s.name}</span>
              <span className="inline-flex items-center gap-1 text-sm">
                <ResultCell point={latest} unit={s.unit} />
                <TrendArrow point={latest} previous={s.points.at(-2)} />
              </span>
            </span>
            <span className="text-xs text-muted">
              {s.unit}
              {formatRange(latest)
                ? ` · normal ${formatRange(latest)}`
                : ""} · {s.points.length}{" "}
              {s.points.length === 1 ? "result" : "results"}, latest{" "}
              {dateLabel(latest.date)}
            </span>
            <LabChart series={s} highlight={highlight} />
          </>
        );
        return (
          <li key={s.key} className="break-inside-avoid">
            {onTest ? (
              <button
                type="button"
                onClick={() => onTest(s.key)}
                aria-label={`${s.name}: open its chart and history`}
                className="flex w-full cursor-pointer flex-col gap-1.5 rounded-xl border border-edge bg-white p-3 text-left hover:border-brand"
              >
                {card}
              </button>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-xl border border-edge bg-white p-3">
                {card}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
