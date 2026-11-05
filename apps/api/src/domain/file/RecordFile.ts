import type { FileFormat } from "@talaan/shared";

export interface RecordFile {
  id: string;
  recordId: string;
  ownerId: string;
  // Where the storage keeps it (Cloudinary public_id, or a local key)
  storageKey: string;
  format: FileFormat;
  bytes: number;
  width: number | null;
  height: number | null;
  pages: number | null;
  originalName: string;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: Date;
}

// What the storage reports about a file it now holds
export interface StoredFile {
  key: string;
  format: FileFormat;
  bytes: number;
  width: number | null;
  height: number | null;
  pages: number | null;
}
