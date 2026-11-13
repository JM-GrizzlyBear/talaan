import {
  labelUrl,
  type SheetLayout,
  shownCode,
  type Size,
} from "@talaan/client";
import { PLACE_KIND_LABELS, type PlaceKind } from "@talaan/shared";
import qrcode from "qrcode-generator";
import { escapeHtml as e } from "../print/printing";

export interface LabelItem {
  code: string;
  name: string | null;
  kind: PlaceKind | null;
}

const clamp = (min: number, value: number, max: number) =>
  Math.min(max, Math.max(min, value));

function qrSvg(text: string, mm: number) {
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();
  const n = code.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (code.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" style="width:${mm}mm;height:${mm}mm;flex:none" xmlns="http://www.w3.org/2000/svg"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

// One label at its real size (the website's PrintLabel)
function labelHtml(item: LabelItem, size: Size) {
  const pad = clamp(1.5, size.height * 0.08, 3);
  const qr = Math.min(size.height - 2 * pad, size.width * 0.45);
  const textWidth = size.width - qr - 3 * pad;
  const compact = textWidth < 16;
  const nameSize = clamp(2.4, size.height * 0.11, 5);
  const smallSize = clamp(1.8, nameSize * 0.72, 3.2);
  const parts: string[] = [];
  if (!compact) {
    parts.push(
      item.name
        ? `<div style="font-size:${nameSize}mm;font-weight:700;line-height:1.1;overflow:hidden">${e(item.name)}</div>`
        : `<div style="font-size:${smallSize}mm">Name:<div style="height:${nameSize * 1.4}mm;border-bottom:0.3mm solid #000"></div></div>`,
    );
    if (item.kind)
      parts.push(
        `<div style="font-size:${smallSize}mm">${PLACE_KIND_LABELS[item.kind]}</div>`,
      );
  }
  parts.push(
    `<div style="font-size:${compact ? clamp(1.8, textWidth / 6, 3) : smallSize}mm;font-family:monospace;font-weight:700;letter-spacing:0.3mm">${
      compact
        ? `${item.code.slice(0, 4)}<br>${item.code.slice(4)}`
        : shownCode(item.code)
    }</div>`,
  );
  parts.push(
    `<div style="font-size:${smallSize * 0.85}mm;color:#555">${item.name ? "Talaan" : "Talaan · scan to name"}</div>`,
  );
  return `<div style="width:${size.width}mm;height:${size.height}mm;padding:${pad}mm;display:flex;gap:${pad}mm;align-items:center;overflow:hidden">
    ${qrSvg(labelUrl(item.code), qr)}<div style="display:flex;flex-direction:column;gap:${pad * 0.4}mm;min-width:0">${parts.join("")}</div></div>`;
}

// Sheets of labels at their real size: one page per sheet, no margins
export function labelSheetsHtml(
  sheets: (LabelItem | null)[][],
  paper: Size,
  label: Size,
  layout: SheetLayout,
  cutLines: boolean,
) {
  const pages = sheets
    .map(
      (
        sheet,
      ) => `<div style="position:relative;width:${paper.width}mm;height:${paper.height}mm;page-break-after:always;overflow:hidden">
        <div style="position:absolute;left:${layout.left}mm;top:${layout.top}mm;display:grid;grid-template-columns:repeat(${layout.columns}, ${label.width}mm);grid-auto-rows:${label.height}mm">
        ${sheet
          .map(
            (item) =>
              `<div style="${cutLines && item ? "outline:0.2mm dashed #999;outline-offset:-0.1mm" : ""}">${item ? labelHtml(item, label) : ""}</div>`,
          )
          .join("")}
        </div></div>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page { size: ${paper.width}mm ${paper.height}mm; margin: 0; } * { box-sizing: border-box; } body { margin: 0; font-family: -apple-system, Roboto, sans-serif; color: #000; }</style></head><body>${pages}</body></html>`;
}
