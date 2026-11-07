import { readLabLines, type ReadLabRow, type TextLine } from "@talaan/shared";
import { photoToCanvas, readImageText } from "./imageText";
import { readPdf } from "./pdfText";
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

const isPdf = (file: Blob, name: string) =>
  file.type === "application/pdf" || /\.pdf$/i.test(name);

// Reads a lab result photo or PDF on this device: nothing is sent anywhere
export async function readLabDocument(
  file: Blob,
  // The file's name: some phones send photos with no type
  name: string,
  onProgress: OnProgress,
): Promise<ReadLabDocument> {
  if (isPdf(file, name)) {
    const pdf = await readPdf(file);
    const pictures = pdf.pages.map((page) =>
      page.toDataURL("image/jpeg", 0.85),
    );
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
      lines.push(...(await readImageText(page, onProgress)));
    }
    return { rows: readLabLines(lines), lines, pictures, from: "photo" };
  }
  if (
    !file.type.startsWith("image/") &&
    !/\.(jpe?g|png|webp|heic|heif)$/i.test(name)
  ) {
    throw new ReaderError("Only photos and PDFs can be read.");
  }
  const canvas = await photoToCanvas(file);
  const lines = await readImageText(canvas, onProgress);
  return {
    rows: readLabLines(lines),
    lines,
    pictures: [canvas.toDataURL("image/jpeg", 0.85)],
    from: "photo",
  };
}
