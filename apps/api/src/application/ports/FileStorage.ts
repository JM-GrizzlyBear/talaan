import type { Readable } from "node:stream";
import type { FileFormat, FileVariant, UploadTarget } from "@talaan/shared";
import type { StoredFile } from "../../domain/file/RecordFile.js";

export interface OpenedFile {
  body: Readable;
  contentType: string;
}

// Where photos and PDFs are kept. The browser uploads straight to it (so big
// files don't pass through the API), then the API checks the upload and
// attaches it. Reading always goes through the API, which checks who's asking.
export interface FileStorage {
  // Somewhere to send one file, under this key prefix
  uploadTarget(keyPrefix: string): Promise<UploadTarget>;
  // Checks that the upload is real, under the prefix, and allowed; returns
  // what it is. Throws FileError otherwise (and removes what was uploaded).
  confirmUpload(response: unknown, keyPrefix: string): Promise<StoredFile>;
  open(
    file: { key: string; format: FileFormat },
    variant: FileVariant,
  ): Promise<OpenedFile>;
  remove(key: string): Promise<void>;
}
