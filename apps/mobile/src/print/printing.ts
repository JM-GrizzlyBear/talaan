import * as Print from "expo-print";
import { openLocal } from "../files/openFile";

// Printing a page the app builds (lab results, the wallet card, QR labels):
// the phone's print screen (AirPrint / Android printing), or a PDF to save
// or send. Sizes are in millimetres, like the website's print pages.
const POINTS_PER_MM = 72 / 25.4;

export interface PageSize {
  width: number;
  height: number;
}

export async function printPage(html: string, page: PageSize) {
  await Print.printAsync({
    html,
    width: Math.round(page.width * POINTS_PER_MM),
    height: Math.round(page.height * POINTS_PER_MM),
  });
}

export async function savePdf(html: string, page: PageSize) {
  const { uri } = await Print.printToFileAsync({
    html,
    width: Math.round(page.width * POINTS_PER_MM),
    height: Math.round(page.height * POINTS_PER_MM),
  });
  await openLocal(uri, "application/pdf");
}

export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

// A whole printable page: the chosen paper, margins, and plain styles
export function pageHtml(body: string, page: PageSize, margin = 12) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
@page { size: ${page.width}mm ${page.height}mm; margin: ${margin}mm; }
* { box-sizing: border-box; }
body { font-family: -apple-system, Roboto, "Segoe UI", sans-serif; color: #111827; font-size: 11pt; margin: 0; }
h1 { font-size: 18pt; margin: 0 0 2mm; } h2 { font-size: 13pt; margin: 6mm 0 2mm; }
table { border-collapse: collapse; width: 100%; font-size: 9.5pt; }
th, td { border-bottom: 1px solid #e5e7eb; padding: 1.6mm 2mm; text-align: left; vertical-align: top; }
thead th { background: #f3f4f6; }
.muted { color: #6b7280; } .low, .high { color: #b91c1c; font-weight: 700; }
.badge { display: inline-block; border-radius: 99px; background: #fee2e2; color: #b91c1c; font-size: 8pt; font-weight: 700; padding: 0 2mm; margin-left: 1mm; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
.card { border: 1px solid #e5e7eb; border-radius: 3mm; padding: 3mm; break-inside: avoid; }
.foot { margin-top: 6mm; font-size: 8.5pt; color: #6b7280; }
</style></head><body>${body}</body></html>`;
}
