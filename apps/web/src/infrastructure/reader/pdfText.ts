import type { TextLine } from "@talaan/shared";
import { groupIntoLines, type PdfTextItem } from "./pdfLines";
import { ReaderError } from "./ReaderError";

// Lab results are rarely longer than this
const MAX_PAGES = 5;
// Fewer letters than this on a page: it's a scanned picture, not text
const MIN_TEXT = 40;

export interface PdfPages {
  // The PDF's own text, line by line (exact), or null when it's a scan
  lines: TextLine[] | null;
  // Each page as a picture, to show next to the results (and to read a scan)
  pages: HTMLCanvasElement[];
}

export async function readPdf(file: Blob): Promise<PdfPages> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/reader/pdf.worker.min.mjs";
  const loading = pdfjs.getDocument({
    data: await file.arrayBuffer(),
  });
  let pdf: Awaited<typeof loading.promise>;
  try {
    pdf = await loading.promise;
  } catch (error) {
    throw new ReaderError(
      (error as Error).name === "PasswordException"
        ? "This PDF has a password. Open it, save a copy without the password, and try again."
        : "This PDF couldn't be opened. Try saving it again, or take a photo of the paper.",
    );
  }

  const lines: TextLine[] = [];
  const pages: HTMLCanvasElement[] = [];
  let textLength = 0;
  try {
    for (let n = 1; n <= Math.min(pdf.numPages, MAX_PAGES); n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const pageLines = groupIntoLines(content.items as PdfTextItem[]);
      lines.push(...pageLines);
      textLength += pageLines.reduce((sum, l) => sum + l.text.length, 0);

      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      pages.push(canvas);
    }
  } finally {
    // Frees the PDF reader's memory
    await loading.destroy();
  }
  return { lines: textLength >= MIN_TEXT ? lines : null, pages };
}
