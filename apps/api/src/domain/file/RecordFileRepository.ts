import type { RecordFile, StoredFile } from "./RecordFile.js";

export interface RecordFileRepository {
  listForRecord(recordId: string): Promise<RecordFile[]>;
  countForRecord(recordId: string): Promise<number>;
  findById(id: string): Promise<RecordFile | null>;
  create(file: {
    recordId: string;
    ownerId: string;
    stored: StoredFile;
    originalName: string;
    uploadedBy: string;
  }): Promise<RecordFile>;
  remove(id: string): Promise<void>;
  // The storage keys of a record's files, before the record is deleted for good
  keysForRecord(recordId: string): Promise<string[]>;
}
