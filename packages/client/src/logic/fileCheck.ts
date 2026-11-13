import { FILE_LIMITS, formatBytes } from "@talaan/shared";

const OK_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];
const OK_NAMES = /\.(jpe?g|png|webp|heic|heif|pdf)$/i;

// A quick check before uploading (the API checks the real content again)
export function fileProblem(file: {
  name: string;
  type: string;
  size: number;
}) {
  if (!OK_TYPES.includes(file.type) && !OK_NAMES.test(file.name)) {
    return "Only photos (JPG, PNG, WEBP, HEIC) and PDFs.";
  }
  if (file.size > FILE_LIMITS.maxBytes) {
    return `Over ${formatBytes(FILE_LIMITS.maxBytes)} (${formatBytes(file.size)}).`;
  }
  if (file.size === 0) return "This file is empty.";
  return null;
}
