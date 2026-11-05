import type { RecordFileInfo } from "@talaan/shared";
import type { RecordFile } from "../../../domain/file/RecordFile.js";

// Domain objects → what the browser receives (dates as ISO strings, no internal fields)

// No storage key: the browser only ever reads files through the API
export function recordFileJson(file: RecordFile): RecordFileInfo {
  return {
    id: file.id,
    recordId: file.recordId,
    name: file.originalName,
    format: file.format,
    bytes: file.bytes,
    width: file.width,
    height: file.height,
    pages: file.pages,
    uploadedByName: file.uploadedByName,
    createdAt: file.createdAt.toISOString(),
  };
}
