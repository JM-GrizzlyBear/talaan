import {
  chartPoints,
  monthLabel,
  niceTicks,
  valueDomain,
} from "@talaan/client";
import type { LabSeries } from "@talaan/shared";

// The website's lab chart, as shapes: drawn by the app (react-native-svg)
// and in printed pages (an SVG in the HTML)
export const CHART_SIZES = {
  small: { width: 300, height: 110, left: 6, right: 6, top: 10, bottom: 8 },
  large: { width: 640, height: 280, left: 48, right: 18, top: 16, bottom: 34 },
};

export interface ChartShapes {
  width: number;
  height: number;
  band: { x: number; y: number; width: number; height: number } | null;
  ticks: { y: number; label: string; x1: number; x2: number }[];
  months: { x: number; y: number; label: string; anchor: "start" | "end" }[];
  line: string;
  dots: {
    x: number;
    y: number;
    r: number;
    out: boolean;
    hollow: boolean;
    ring: boolean;
  }[];
}

export function chartShapes(
  series: LabSeries,
  size: keyof typeof CHART_SIZES,
  highlight?: string,
): ChartShapes | null {
  const points = chartPoints(series);
  const box = CHART_SIZES[size];
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
  const large = size === "large";
  return {
    width: box.width,
    height: box.height,
    band: hasRange
      ? {
          x: box.left,
          y: Math.max(box.top, bandTop),
          width: plotW,
          height: Math.max(
            0,
            Math.min(box.top + plotH, bandBottom) - Math.max(box.top, bandTop),
          ),
        }
      : null,
    ticks: large
      ? niceTicks(low, high).map((tick) => ({
          y: y(tick),
          label: String(tick),
          x1: box.left,
          x2: box.left + plotW,
        }))
      : [],
    months: large
      ? [
          {
            x: box.left,
            y: box.height - 8,
            label: monthLabel(points[0].date),
            anchor: "start" as const,
          },
          ...(points.length > 1
            ? [
                {
                  x: box.left + plotW,
                  y: box.height - 8,
                  label: monthLabel(latest.date),
                  anchor: "end" as const,
                },
              ]
            : []),
        ]
      : [],
    line: points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${x(times[i])},${y(p.value as number)}`,
      )
      .join(" "),
    dots: points.map((p, i) => ({
      x: x(times[i]),
      y: y(p.value as number),
      r: large ? 5 : 3.5,
      out: p.flag !== null,
      hollow: Boolean(p.sign),
      ring: highlight === p.recordId,
    })),
  };
}

// The same chart as SVG text, for printing
export function chartSvg(
  series: LabSeries,
  size: keyof typeof CHART_SIZES,
  colors: {
    brand: string;
    danger: string;
    band: string;
    deep: string;
    muted: string;
  },
) {
  const s = chartShapes(series, size);
  if (!s) return "";
  const parts = [
    `<svg viewBox="0 0 ${s.width} ${s.height}" width="100%" xmlns="http://www.w3.org/2000/svg">`,
    s.band
      ? `<rect x="${s.band.x}" y="${s.band.y}" width="${s.band.width}" height="${s.band.height}" fill="${colors.band}"/>`
      : "",
    ...s.ticks.map(
      (t) =>
        `<line x1="${t.x1}" x2="${t.x2}" y1="${t.y}" y2="${t.y}" stroke="#ddd" stroke-dasharray="3 3"/><text x="${t.x1 - 8}" y="${t.y}" text-anchor="end" dominant-baseline="middle" font-size="11" fill="${colors.muted}">${t.label}</text>`,
    ),
    ...s.months.map(
      (m) =>
        `<text x="${m.x}" y="${m.y}" text-anchor="${m.anchor}" font-size="11" fill="${colors.muted}">${m.label}</text>`,
    ),
    `<path d="${s.line}" fill="none" stroke="${colors.brand}" stroke-width="2" stroke-linejoin="round"/>`,
    ...s.dots.map((d) => {
      const c = d.out ? colors.danger : colors.brand;
      return `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" stroke="${c}" stroke-width="2" fill="${d.hollow ? "#fff" : c}"/>`;
    }),
    "</svg>",
  ];
  return parts.join("");
}
