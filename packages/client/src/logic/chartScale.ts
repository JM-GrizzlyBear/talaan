import type { LabPoint, LabSeries } from "@talaan/shared";

// The points a chart can draw: numbers in the test's own unit
export const chartPoints = (series: LabSeries) =>
  series.points.filter((p) => p.value !== null && !p.otherUnit);

// "Sep 2025"
export const monthLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

// "Sep 1, 2025"
export const dateLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

// Round numbers for the side of the chart: 0, 50, 100…
export function niceTicks(low: number, high: number, count = 4) {
  const span = high - low || Math.abs(high) || 1;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (
    let v = Math.ceil(low / step) * step;
    v <= high + step / 1000;
    v += step
  ) {
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  return ticks;
}

// The value range to draw: the results and the normal range, with room
export function valueDomain(points: LabPoint[]) {
  const latest = points.at(-1);
  const values = points.map((p) => p.value as number);
  if (latest?.rangeLow != null) values.push(latest.rangeLow);
  if (latest?.rangeHigh != null) values.push(latest.rangeHigh);
  let low = Math.min(...values);
  let high = Math.max(...values);
  if (low === high) {
    low -= Math.abs(low) * 0.1 || 1;
    high += Math.abs(high) * 0.1 || 1;
  }
  const pad = (high - low) * 0.12;
  return {
    low: Math.max(low - pad, low >= 0 ? 0 : -Infinity),
    high: high + pad,
  };
}

// What a screen reader hears instead of the chart
export function chartDescription(series: LabSeries) {
  const points = chartPoints(series);
  const unit = series.unit ? ` ${series.unit}` : "";
  const latest = points.at(-1);
  const range =
    latest && (latest.rangeLow !== null || latest.rangeHigh !== null)
      ? `, normal ${latest.rangeLow ?? "below"} to ${latest.rangeHigh ?? "above"}`
      : "";
  return `${series.name}${range}: ${points
    .map(
      (p) =>
        `${p.shown}${unit} on ${dateLabel(p.date)}${p.flag ? ` (${p.flag})` : ""}`,
    )
    .join("; ")}`;
}
