import { FILE_FORMATS, type FileFormat } from "@talaan/shared";

// What a file really is, from its first bytes (a renamed file can't pretend)
export function sniffFormat(head: Uint8Array): FileFormat | null {
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...head.subarray(from, to));
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpg";
  if (
    head[0] === 0x89 &&
    ascii(1, 4) === "PNG" &&
    head[4] === 0x0d &&
    head[5] === 0x0a
  ) {
    return "png";
  }
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(0, 5) === "%PDF-") return "pdf";
  // HEIC/HEIF (iPhone photos): an "ftyp" box with a HEIF brand
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (
      ["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(brand)
    ) {
      return "heic";
    }
  }
  return null;
}

// Cloudinary says "jpeg" or "heif" sometimes; Talaan keeps one name for each
export function normalizeFormat(format: string): FileFormat | null {
  const lower = format.toLowerCase();
  if (lower === "jpeg") return "jpg";
  if (lower === "heif") return "heic";
  return (FILE_FORMATS as readonly string[]).includes(lower)
    ? (lower as FileFormat)
    : null;
}

export const CONTENT_TYPES: Record<FileFormat, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  pdf: "application/pdf",
};

// A name that's safe in a download header: no path, no control characters
export function safeFileName(name: string, format: FileFormat) {
  const base =
    name
      .split(/[\\/]/)
      .pop()
      ?.replace(/[\u0000-\u001f\u007f"]/g, "")
      .trim() || "file";
  const extension =
    format === "jpg" ? /\.(jpe?g)$/i : new RegExp(`\\.${format}$`, "i");
  return extension.test(base) ? base : `${base}.${format}`;
}
