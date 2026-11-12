import {
  type ReadDetails,
  readDetails,
  readLabLines,
  type ReadLabRow,
  type TextLine,
} from "@talaan/shared";
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
  // The date, doctor, hospital, type and the rest, when reading a whole record
  details: ReadDetails;
}

// Today on this device, YYYY-MM-DD (a later date is marked)
function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

const finish = (
  lines: TextLine[],
  pictures: string[],
  from: "text" | "photo",
): ReadLabDocument => ({
  rows: readLabLines(lines),
  lines,
  pictures,
  from,
  details: readDetails(lines, today()),
});

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
    if (pdf.lines) return finish(pdf.lines, pictures, "text");
    // A scanned PDF: read its pages like photos
    const lines: TextLine[] = [];
    for (const page of pdf.pages) {
      lines.push(...(await readPhotoText(page, onProgress)));
    }
    return finish(lines, pictures, "photo");
  }
  if (!isPhoto(file, name)) {
    throw new ReaderError("Only photos and PDFs can be read.");
  }
  const canvas = await photoToCanvas(file);
  const lines = await readPhotoText(canvas, onProgress);
  return finish(lines, [toPicture(canvas)], "photo");
}
