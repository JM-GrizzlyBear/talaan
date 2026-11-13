import { useEffect, useState } from "react";
import { PAPER_SIZES, type PaperSizeId } from "@talaan/client";

export interface LabPrintSettings {
  paper: PaperSizeId;
  orientation: "portrait" | "landscape";
  table: boolean;
  charts: boolean;
  attention: boolean;
  // How many of the latest dates the table shows; 0: all
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

// The page in millimetres, turned for landscape
export function pageSize(settings: LabPrintSettings) {
  const { width, height } = PAPER_SIZES[settings.paper];
  return settings.orientation === "portrait"
    ? { width, height }
    : { width: height, height: width };
}

const KEY = "talaan.labPrint";

// Remembered on this device (a convenience: works the same without it)
export function useLabPrintSettings() {
  const [settings, setSettings] = useState<LabPrintSettings>(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      const parsed = saved
        ? ({ ...DEFAULT_LAB_PRINT, ...JSON.parse(saved) } as LabPrintSettings)
        : DEFAULT_LAB_PRINT;
      return parsed.paper in PAPER_SIZES ? parsed : DEFAULT_LAB_PRINT;
    } catch {
      return DEFAULT_LAB_PRINT;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Not kept
    }
  }, [settings]);
  return [settings, setSettings] as const;
}
