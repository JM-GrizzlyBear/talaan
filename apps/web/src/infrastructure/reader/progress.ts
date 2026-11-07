// How far reading is, for the progress bar
export interface ReadProgress {
  // "Getting the reader ready" happens once per browser; then it's kept
  step: "preparing" | "reading";
  // 0 to 1
  fraction: number;
}

export type OnProgress = (progress: ReadProgress) => void;
