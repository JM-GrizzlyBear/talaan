import { z } from "zod";

// Photos and PDFs attached to a record (the X-ray film, the lab printout, the SOA)
export const FILE_LIMITS = {
  // Cloudinary's free plan takes images up to 10 MB
  maxBytes: 10 * 1024 * 1024,
  perRecord: 20,
  nameMax: 255,
} as const;

// What can be uploaded: photos (including iPhone HEIC) and PDFs
export const FILE_FORMATS = ["jpg", "png", "webp", "heic", "pdf"] as const;
export type FileFormat = (typeof FILE_FORMATS)[number];

// For the file picker
export const FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf";

// "thumb": a small picture for lists; "preview": big enough to read on screen;
// "original": the file exactly as uploaded
export const FILE_VARIANTS = ["thumb", "preview", "original"] as const;
export type FileVariant = (typeof FILE_VARIANTS)[number];

// Where the browser sends the file. Cloudinary: a form POST with signed
// fields. On a computer without Cloudinary: a PUT of the file to the API.
export interface UploadTarget {
  method: "POST" | "PUT";
  url: string;
  // Form fields sent with the file (empty for PUT)
  fields: Record<string, string>;
  // The form field that holds the file; null: the file is the whole body
  fileField: string | null;
}

export const attachFileSchema = z.object({
  // What the upload answered, checked by the API before attaching
  upload: z.record(z.string(), z.unknown()),
  name: z
    .string()
    .trim()
    .min(1, "The file needs a name")
    .max(FILE_LIMITS.nameMax),
});

export interface RecordFileInfo {
  id: string;
  recordId: string;
  name: string;
  format: FileFormat;
  bytes: number;
  width: number | null;
  height: number | null;
  // PDFs: how many pages, when known
  pages: number | null;
  uploadedByName: string | null;
  createdAt: string;
}

// "2.4 MB", "830 KB"
export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
