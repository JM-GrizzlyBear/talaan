import type { RecordFileInfo } from "@talaan/shared";

// What the reader can open: photos and PDFs
const READABLE = new Set(["jpg", "png", "webp", "heic", "pdf"]);

export const canRead = (file: RecordFileInfo) => READABLE.has(file.format);
