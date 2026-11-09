import type { LabSeries } from "@talaan/shared";
import {
  chartDescription,
  chartPoints,
  monthLabel,
  niceTicks,
  valueDomain,
} from "./chartScale";

const SIZES = {
  small: { width: 300, height: 110, left: 6, right: 6, top: 10, bottom: 8 },
  large: { width: 640, height: 280, left: 48, right: 18, top: 16, bottom: 34 },
};

// A test's results over time: the line, the normal range shaded, points
// outside it in red ("<0.5"-style results hollow)
export function LabChart({
  series,
  size = "small",
  highlight,
}: {
  series: LabSeries;
  size?: keyof typeof SIZES;
  // A record to ring (the one opened from)
  highlight?: string;
}) {
  const points = chartPoints(series);
  const box = SIZES[size];
  if (points.length === 0) return null;

  const { low, high } = valueDomain(points);
  const times = points.map((p) => Date.parse(`${p.date}T00:00:00Z`));
  const first = Math.min(...times);
  const last = Math.max(...times);
  const plotW = box.width - box.left - box.right;
  const plotH = box.height - box.top - box.bottom;
  const x = (t: number) =>
    last === first
      ? box.left + plotW / 2
      : box.left + ((t - first) / (last - first)) * plotW;
  const y = (v: number) => box.top + (1 - (v - low) / (high - low)) * plotH;

  const latest = points.at(-1)!;
  const bandTop = latest.rangeHigh !== null ? y(latest.rangeHigh) : box.top;
  const bandBottom =
    latest.rangeLow !== null ? y(latest.rangeLow) : box.top + plotH;
  const hasRange = latest.rangeLow !== null || latest.rangeHigh !== null;
  const line = points
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${x(times[i])},${y(p.value as number)}`,
    )
    .join(" ");
  const large = size === "large";

  return (
    <svg
      viewBox={`0 0 ${box.width} ${box.height}`}
      role="img"
      aria-label={chartDescription(series)}
      className="h-auto w-full overflow-visible"
    >
      {hasRange && (
        <rect
          x={box.left}
          y={Math.max(box.top, bandTop)}
          width={plotW}
          height={Math.max(
            0,
            Math.min(box.top + plotH, bandBottom) - Math.max(box.top, bandTop),
          )}
          className="fill-brand-soft"
        />
      )}
      {large &&
        niceTicks(low, high).map((tick) => (
          <g key={tick}>
            <line
              x1={box.left}
              x2={box.left + plotW}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-gray-200"
              strokeDasharray="3 3"
            />
            <text
              x={box.left - 8}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-gray-500 text-[11px]"
            >
              {tick}
            </text>
          </g>
        ))}
      {large && (
        <>
          <text
            x={box.left}
            y={box.height - 8}
            className="fill-gray-500 text-[11px]"
          >
            {monthLabel(points[0].date)}
          </text>
          {points.length > 1 && (
            <text
              x={box.left + plotW}
              y={box.height - 8}
              textAnchor="end"
              className="fill-gray-500 text-[11px]"
            >
              {monthLabel(latest.date)}
            </text>
          )}
        </>
      )}
      <path
        d={line}
        fill="none"
        className="stroke-brand"
        strokeWidth={large ? 2.5 : 2}
        strokeLinejoin="round"
      />
      {points.map((p, i) => {
        const out = p.flag !== null;
        const r = large ? 5 : 3.5;
        return (
          <g key={`${p.recordId}-${i}`}>
            {highlight === p.recordId && (
              <circle
                cx={x(times[i])}
                cy={y(p.value as number)}
                r={r + 4}
                fill="none"
                className="stroke-deep"
                strokeWidth={2}
              />
            )}
            <circle
              cx={x(times[i])}
              cy={y(p.value as number)}
              r={r}
              strokeWidth={2}
              className={
                p.sign
                  ? `fill-white ${out ? "stroke-danger" : "stroke-brand"}`
                  : out
                    ? "fill-danger stroke-danger"
                    : "fill-brand stroke-brand"
              }
            />
          </g>
        );
      })}
    </svg>
  );
}
