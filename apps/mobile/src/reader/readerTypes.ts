import type { ReadDetails, ReadLabRow } from "@talaan/shared";

// What the website's reader gives back (apps/web … readLabDocument)
export interface ReadResult {
  rows: ReadLabRow[];
  lines: { text: string }[];
  pictures: string[];
  from: "text" | "photo";
  details: ReadDetails;
}

export interface ReadProgress {
  step: "preparing" | "reading";
  fraction: number;
}

export type BridgeMessage =
  | { type: "ready" }
  | { type: "progress"; id: number; progress: ReadProgress }
  | { type: "done"; id: number; result: ReadResult }
  | { type: "failed"; id: number; message: string }
  | { type: "drawn"; id: number; dataUrl: string };
