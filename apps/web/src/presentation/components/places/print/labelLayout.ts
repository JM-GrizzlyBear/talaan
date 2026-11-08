import type { Size } from "./sizes";

export interface SheetLayout {
  columns: number;
  rows: number;
  perSheet: number;
  // Where the grid starts, so it sits in the middle of the page
  left: number;
  top: number;
}

// Rounding: 3 × 70 mm labels fill 210 mm A4 exactly
const EPSILON = 0.01;

// How many labels of this size fit on the paper, inside the margin
export function sheetLayout(
  paper: Size,
  label: Size,
  margin: number,
): SheetLayout {
  const usableWidth = paper.width - 2 * margin;
  const usableHeight = paper.height - 2 * margin;
  const columns = Math.max(
    0,
    Math.floor((usableWidth + EPSILON) / label.width),
  );
  const rows = Math.max(0, Math.floor((usableHeight + EPSILON) / label.height));
  return {
    columns,
    rows,
    perSheet: columns * rows,
    left: (paper.width - columns * label.width) / 2,
    top: (paper.height - rows * label.height) / 2,
  };
}

// Labels laid out on sheets. `skip`: spaces already used on the first sheet
// (a sticker sheet printed before), left empty.
export function toSheets<T>(
  items: T[],
  perSheet: number,
  skip: number,
): (T | null)[][] {
  if (perSheet <= 0 || items.length === 0) return [];
  const used = Math.min(Math.max(0, skip), perSheet - 1);
  const slots: (T | null)[] = [
    ...Array.from({ length: used }, () => null),
    ...items,
  ];
  const sheets: (T | null)[][] = [];
  for (let i = 0; i < slots.length; i += perSheet) {
    sheets.push(slots.slice(i, i + perSheet));
  }
  return sheets;
}
