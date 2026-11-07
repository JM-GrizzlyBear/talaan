import { readLabLines, type ReadLabRow, type TextLine } from "@talaan/shared";
import { isPdf, isPhoto } from "./fileKind";
import { readPdf } from "./pdf/readPdf";
import { photoToCanvas } from "./photo/photoToCanvas";
import { readPhotoText } from "./photo/readPhotoText";
import type { OnProgress } from "./progress";
import { ReaderError } from "./ReaderError";

export interface ReadLabDocument {
  rows: ReadLabRow[];
  // Everything that was read, for "Show the text it read"
  lines: TextLine[];
  // Pictures of the photo or the PDF's pages, to check against
  pictures: string[];
  // "text": a PDF's own text (exact); "photo": read from a picture
  from: "text" | "photo";
}

// A picture to show beside the rows
const toPicture = (canvas: HTMLCanvasElement) =>
  canvas.toDataURL("image/jpeg", 0.85);

// Reads a lab result photo or PDF on this device: nothing is sent anywhere
export async function readLabDocument(
  file: Blob,
  name: string,
  onProgress: OnProgress,
): Promise<ReadLabDocument> {
  if (isPdf(file, name)) {
    const pdf = await readPdf(file);
    const pictures = pdf.pages.map(toPicture);
    if (pdf.lines) {
      return {
        rows: readLabLines(pdf.lines),
        lines: pdf.lines,
        pictures,
        from: "text",
      };
    }
    // A scanned PDF: read its pages like photos
    const lines: TextLine[] = [];
    for (const page of pdf.pages) {
      lines.push(...(await readPhotoText(page, onProgress)));
    }
    return { rows: readLabLines(lines), lines, pictures, from: "photo" };
  }
  if (!isPhoto(file, name)) {
    throw new ReaderError("Only photos and PDFs can be read.");
  }
  const canvas = await photoToCanvas(file);
  const lines = await readPhotoText(canvas, onProgress);
  return {
    rows: readLabLines(lines),
    lines,
    pictures: [toPicture(canvas)],
    from: "photo",
  };
}
