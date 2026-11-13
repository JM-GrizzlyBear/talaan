import { dateLabel, PAPER_SIZES, type PaperSizeId } from "@talaan/client";
import {
  formatRange,
  type LabRecordResults,
  type LabSeries,
  needsAttention,
} from "@talaan/shared";
import { escapeHtml as e, pageHtml } from "../print/printing";
import { chartSvg } from "./chartGeometry";

export interface LabPrintSettings {
  paper: PaperSizeId;
  orientation: "portrait" | "landscape";
  table: boolean;
  charts: boolean;
  attention: boolean;
  dates: number;
}

export const DEFAULT_LAB_PRINT: LabPrintSettings = {
  paper: "a4",
  orientation: "portrait",
  table: true,
  charts: true,
  attention: true,
  dates: 6,
};

export function pageSize(settings: LabPrintSettings) {
  const { width, height } = PAPER_SIZES[settings.paper];
  return settings.orientation === "portrait"
    ? { width, height }
    : { width: height, height: width };
}

const COLORS = {
  brand: "#0f766e",
  danger: "#b91c1c",
  band: "#ccfbf1",
  deep: "#134e4a",
  muted: "#6b7280",
};

const cell = (p: LabSeries["points"][number] | undefined) =>
  p
    ? `<span class="${p.flag ?? ""}">${e(p.shown)}${p.otherUnit ? ` ${e(p.writtenUnit)}` : ""}${p.converted ? "*" : ""}</span>${p.flag ? `<span class="badge">${p.flag === "low" ? "Low" : "High"}</span>` : ""}`
    : `<span class="muted">—</span>`;

// The same page the website prints: needs attention, the table, the charts
export function labsPrintHtml(
  settings: LabPrintSettings,
  personName: string,
  series: LabSeries[],
  columns: LabRecordResults[],
) {
  const shown = settings.dates ? columns.slice(0, settings.dates) : columns;
  const ids = new Set(shown.map((c) => c.recordId));
  const tableSeries = series.filter((s) =>
    s.points.some((p) => ids.has(p.recordId)),
  );
  const printed = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const attention = needsAttention(series);
  const parts: string[] = [
    `<div style="display:flex;justify-content:space-between;gap:8mm;border-bottom:2px solid #0f766e;padding-bottom:3mm">
      <div><h1>Lab results: ${e(personName)}</h1><div class="muted">${columns.length} lab ${columns.length === 1 ? "record" : "records"}${columns.length ? `, ${columns.at(-1)!.date} to ${columns[0].date}` : ""}</div></div>
      <div class="muted" style="text-align:right">Printed ${printed}<br>from Talaan</div></div>`,
  ];
  if (settings.attention) {
    parts.push(`<h2>Needs attention (${attention.length})</h2>`);
    parts.push(
      attention.length === 0
        ? `<p>Every latest result is within its normal range.</p>`
        : `<table><tbody>${attention
            .map((s) => {
              const latest = s.points.at(-1)!;
              return `<tr><th>${e(s.name)}</th><td>${cell(latest)} ${e(s.unit)}</td><td class="muted">${formatRange(latest) ? `Normal ${e(formatRange(latest))} · ` : ""}${e(dateLabel(latest.date))}</td></tr>`;
            })
            .join("")}</tbody></table>`,
    );
  }
  if (settings.table) {
    parts.push(
      `<h2>Results${settings.dates > 0 && columns.length > settings.dates ? ` (the latest ${settings.dates} of ${columns.length} dates)` : ""}</h2>`,
    );
    const head = `<tr><th>Test</th><th>Normal</th>${shown.map((c) => `<th>${e(dateLabel(c.date))}${c.facility ? `<br><span class="muted">${e(c.facility)}</span>` : ""}</th>`).join("")}</tr>`;
    const body = tableSeries
      .map((s, i) => {
        const group =
          i === 0 || tableSeries[i - 1].group !== s.group
            ? `<tr><th colspan="${shown.length + 2}" style="background:#f9fafb">${e(s.group)}</th></tr>`
            : "";
        const latest = s.points.at(-1);
        return `${group}<tr><th>${e(s.name)}${s.unit ? `<br><span class="muted">${e(s.unit)}</span>` : ""}</th><td class="muted">${latest ? e(formatRange(latest)) : ""}</td>${shown.map((c) => `<td>${cell(s.points.find((p) => p.recordId === c.recordId))}</td>`).join("")}</tr>`;
      })
      .join("");
    parts.push(`<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
  }
  if (settings.charts) {
    const charted = series.filter((s) => s.numeric);
    parts.push(`<h2>Charts</h2>`);
    parts.push(
      `<div class="grid">${charted
        .map((s) => {
          const latest = s.points.at(-1)!;
          return `<div class="card"><strong>${e(s.name)}</strong> ${cell(latest)}<div class="muted" style="font-size:8.5pt">${e(s.unit)}${formatRange(latest) ? ` · normal ${e(formatRange(latest))}` : ""}</div>${chartSvg(s, "small", COLORS)}</div>`;
        })
        .join("")}</div>`,
    );
  }
  parts.push(
    `<p class="foot">* Converted from another unit. Low and High follow the normal range printed on each result. For discussing with a doctor; not a diagnosis.</p>`,
  );
  return pageHtml(parts.join(""), pageSize(settings));
}
