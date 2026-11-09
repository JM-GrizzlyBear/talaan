// Paper and label sizes for printing QR labels, in millimetres

import { PAPER_SIZES, type Size } from "../../print/paper";

export { PAPER_SIZES, type Size };

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
