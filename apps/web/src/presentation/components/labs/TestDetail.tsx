import { formatRange, labStats, type LabSeries } from "@talaan/shared";
import { Link } from "react-router";
import { dateLabel } from "./chartScale";
import { LabChart } from "./LabChart";
import { ResultCell } from "./ResultCell";
import { TrendArrow } from "./TrendArrow";

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

// One test: a big chart, its numbers, and every result (newest first)
export function TestDetail({
  series,
  highlight,
}: {
  series: LabSeries;
  highlight?: string;
}) {
  const stats = labStats(series);
  const unit = series.unit ? ` ${series.unit}` : "";
  const facts: [string, string][] = stats
    ? [
        ["Latest", `${stats.latest.shown}${unit}`],
        [
          "Change since the one before",
          stats.change === null
            ? "—"
            : `${signed(stats.change)}${unit}${stats.changePercent !== null ? ` (${signed(stats.changePercent)}%)` : ""}`,
        ],
        ["Lowest", stats.lowest === null ? "—" : `${stats.lowest}${unit}`],
        ["Highest", stats.highest === null ? "—" : `${stats.highest}${unit}`],
        ["Average", stats.average === null ? "—" : `${stats.average}${unit}`],
        [
          "Outside the normal range",
          `${stats.timesOutOfRange} of ${series.points.length}`,
        ],
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      {series.numeric && (
        <div className="rounded-xl border border-edge bg-white p-4">
          <LabChart series={series} size="large" highlight={highlight} />
          <p className="mt-2 text-xs text-muted">
            Shaded: the normal range of the latest result. Red: outside it.
            Hollow: results like “&lt;0.5”.
          </p>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-edge bg-white p-3"
          >
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-lg font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <ul className="flex flex-col divide-y divide-edge rounded-xl border border-edge bg-white">
        {[...series.points].reverse().map((point, i, all) => (
          <li
            key={`${point.recordId}-${i}`}
            className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${
              highlight === point.recordId ? "bg-brand-soft" : ""
            }`}
          >
            <span className="flex flex-col">
              <Link
                to={`/records/${point.recordId}`}
                className="font-semibold text-brand underline-offset-2 hover:underline"
              >
                {dateLabel(point.date)}
              </Link>
              {point.facility && (
                <span className="text-xs text-muted">{point.facility}</span>
              )}
            </span>
            <span className="flex items-center gap-2">
              <ResultCell point={point} unit={series.unit} explain />
              <TrendArrow point={point} previous={all[i + 1]} />
              <span className="text-xs text-muted">
                {formatRange(point) && `normal ${formatRange(point)}`}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
