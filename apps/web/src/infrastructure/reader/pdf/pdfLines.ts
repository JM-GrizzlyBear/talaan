import type { TextLine } from "@talaan/shared";

// A piece of text on a PDF page, where pdf.js puts it
export interface PdfTextItem {
  str: string;
  // [a, b, c, d, x, y]: x and y say where it starts
  transform: number[];
  height: number;
}

// Pieces at the same height form one line, left to right (a PDF has no lines,
// only pieces of text placed on the page)
export function groupIntoLines(items: PdfTextItem[]): TextLine[] {
  const rows: {
    y: number;
    height: number;
    parts: { x: number; str: string }[];
  }[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    const tolerance = Math.max(2, item.height * 0.5);
    let row = rows.find((r) => Math.abs(r.y - y) <= tolerance);
    if (!row) {
      row = { y, height: item.height, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, str: item.str });
  }
  // PDF y grows upwards: the top of the page comes first
  rows.sort((a, b) => b.y - a.y);
  return rows.map((row) => ({
    text: row.parts
      .sort((a, b) => a.x - b.x)
      .map((p) => p.str.trim())
      .join(" "),
    confidence: null,
  }));
}
