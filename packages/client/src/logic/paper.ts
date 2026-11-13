// Paper sizes for printing (labels, lab results), in millimetres

export interface Size {
  width: number;
  height: number;
}

export const PAPER_SIZES = {
  a4: { name: "A4", width: 210, height: 297 },
  letter: { name: "Short / Letter (8.5 × 11 in)", width: 215.9, height: 279.4 },
  long: { name: "Long / Folio (8.5 × 13 in)", width: 215.9, height: 330.2 },
  legal: { name: "Legal (8.5 × 14 in)", width: 215.9, height: 355.6 },
  a5: { name: "A5", width: 148, height: 210 },
  a3: { name: "A3", width: 297, height: 420 },
  b5: { name: "B5", width: 176, height: 250 },
  halfLetter: {
    name: "Half letter (5.5 × 8.5 in)",
    width: 139.7,
    height: 215.9,
  },
  photo4x6: { name: "Photo paper (4 × 6 in)", width: 101.6, height: 152.4 },
} as const satisfies Record<string, Size & { name: string }>;
export type PaperSizeId = keyof typeof PAPER_SIZES;
