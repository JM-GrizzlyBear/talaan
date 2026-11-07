import type { TextLine } from "@talaan/shared";
import type { OnProgress } from "../progress";
import { READER_FILES } from "../readerFiles";
import { ReaderError } from "../ReaderError";
import { cleanForReading } from "./cleanForReading";
import { MAX_SIDE } from "./photoToCanvas";

// The free text reader (Tesseract). Loaded only when someone reads a photo.
const PATHS = {
  workerPath: READER_FILES.tesseractWorker,
  corePath: READER_FILES.tesseractCore,
  langPath: READER_FILES.tesseractLanguage,
  // A plain worker file, not a blob: the site's security policy allows only its own scripts
  workerBlobURL: false,
};

// Lines of text from a picture, with how sure the reader is of each
export async function readPhotoText(
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
