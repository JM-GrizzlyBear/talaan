// One line of text, as a reader (Tesseract, a PDF, a phone) gives it
export interface TextLine {
  text: string;
  // 0–100: how sure the reader is of the letters; null when exact (a PDF's text)
  confidence: number | null;
}

// A lab result found in the text, for the person to check before it's used
export interface ReadLabRow {
  name: string;
  value: string;
  unit: string;
  rangeLow: number | null;
  rangeHigh: number | null;
  // Why it may be wrong (empty: looks right). Shown on the check screen.
  doubts: string[];
  // The line it came from, to compare against the photo
  line: string;
}
