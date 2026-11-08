// Paper and label sizes for printing QR labels, in millimetres

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
export type PaperId = keyof typeof PAPER_SIZES | "custom";

// Common sticker sizes. "tiny" fits only the QR code and its code.
export const LABEL_SIZES = {
  large: { name: "Large", width: 99, height: 67 },
  medium: { name: "Medium", width: 70, height: 37 },
  small: { name: "Small", width: 52, height: 30 },
  tiny: { name: "Tiny (QR and code only)", width: 38, height: 21 },
} as const satisfies Record<string, Size & { name: string }>;
export type LabelSizeId = keyof typeof LABEL_SIZES | "custom";

// Plain paper needs a margin (most printers can't print to the edge);
// sticker sheets are cut to the edge, so they need none
export const MARGINS = [
  { value: 0, name: "None (sticker sheets)" },
  { value: 5, name: "5 mm" },
  { value: 10, name: "10 mm" },
] as const;

// What can be typed for a custom size
export const CUSTOM_LIMITS = {
  paper: { min: 50, max: 500 },
  label: { min: 15, max: 200 },
};

export interface PrintSettings {
  paper: PaperId;
  customPaper: Size;
  label: LabelSizeId;
  customLabel: Size;
  margin: number;
  cutLines: boolean;
}

export const DEFAULT_SETTINGS: PrintSettings = {
  paper: "a4",
  customPaper: { width: 210, height: 297 },
  label: "medium",
  customLabel: { width: 60, height: 35 },
  margin: 0,
  cutLines: true,
};

export function paperSize(settings: PrintSettings): Size {
  return settings.paper === "custom"
    ? settings.customPaper
    : PAPER_SIZES[settings.paper];
}

export function labelSize(settings: PrintSettings): Size {
  return settings.label === "custom"
    ? settings.customLabel
    : LABEL_SIZES[settings.label];
}
