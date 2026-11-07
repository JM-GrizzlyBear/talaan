import type { TextLine } from "@talaan/shared";
import { cleanForReading } from "./cleanForReading";
import type { OnProgress } from "./progress";
import { ReaderError } from "./ReaderError";

// The free text reader (Tesseract), served from Talaan's own site
// (scripts/copy-reader-files.mjs). Loaded only when someone reads a photo.
const PATHS = {
  workerPath: "/reader/worker.min.js",
  corePath: "/reader/core",
  langPath: "/reader/lang",
  // A plain worker file, not a blob: the site's security policy allows only its own scripts
  workerBlobURL: false,
};

// Big photos are slower and no clearer to the reader
const MAX_SIDE = 2400;

// A photo on a canvas, upright (phones store rotation separately) and not too big
export async function photoToCanvas(photo: Blob) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" });
  } catch {
    throw new ReaderError(
      /heic|heif/i.test(photo.type)
        ? "This browser can't open HEIC photos. Open it in Safari, or save it as a JPG and try again."
        : "This photo couldn't be opened. Try another photo, or save it as a JPG.",
    );
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

// Lines of text from a picture, with how sure the reader is of each
export async function readImageText(
  image: HTMLCanvasElement,
  onProgress: OnProgress,
): Promise<TextLine[]> {
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  let worker: Awaited<ReturnType<typeof createWorker>>;
  try {
    worker = await createWorker("eng", OEM.LSTM_ONLY, {
      ...PATHS,
      logger: (message) => {
        const preparing = message.status !== "recognizing text";
        onProgress({
          step: preparing ? "preparing" : "reading",
          fraction: message.progress ?? 0,
        });
      },
    });
  } catch {
    throw new ReaderError(
      "The reader couldn't start. Check your connection (the first time it downloads about 7 MB), then try again.",
    );
  }
  // Bigger, grey, with the table lines taken out
  const clean = cleanForReading(image, MAX_SIDE);
  try {
    const read = async (mode: (typeof PSM)[keyof typeof PSM]) => {
      // "Single block" reads a table row by row, so a test stays with its result
      await worker.setParameters({
        tessedit_pageseg_mode: mode,
        preserve_interword_spaces: "1",
      });
      const result = await worker.recognize(clean, {}, { blocks: true });
      return (result.data.blocks ?? []).flatMap((block) =>
        block.paragraphs.flatMap((paragraph) =>
          paragraph.lines.map((line) => ({
            text: line.text,
            confidence: line.confidence,
          })),
        ),
      );
    };
    const lines = await read(PSM.SINGLE_BLOCK);
    // Hardly anything: try letting the reader find the layout itself
    if (lines.filter((l) => /\d/.test(l.text)).length < 2) {
      const auto = await read(PSM.AUTO);
      if (auto.length > lines.length) return auto;
    }
    return lines;
  } finally {
    await worker.terminate();
  }
}
