import type { FileVariant, RecordFileInfo, UploadTarget } from "@talaan/shared";
import { ApiError, request } from "./http";
import { fileName, sendToStorage, type UploadFile } from "./upload";

export async function fetchRecordFiles(recordId: string) {
  const data = await request<{ files: RecordFileInfo[] }>(
    `/api/records/${encodeURIComponent(recordId)}/files`,
  );
  return data.files;
}

async function uploadTarget(recordId: string) {
  const data = await request<{ target: UploadTarget }>(
    `/api/records/${encodeURIComponent(recordId)}/files/upload-target`,
    "POST",
  );
  return data.target;
}

// The three steps: where to send it, sending it, attaching it to the record
export async function uploadRecordFile(
  recordId: string,
  file: UploadFile,
  onProgress: (fraction: number) => void,
) {
  const target = await uploadTarget(recordId);
  const answer = await sendToStorage(target, file, onProgress);
  const data = await request<{ file: RecordFileInfo }>(
    `/api/records/${encodeURIComponent(recordId)}/files`,
    "POST",
    { upload: answer, name: fileName(file) },
  );
  return data.file;
}

export async function removeRecordFile(id: string) {
  await request<void>(`/api/files/${encodeURIComponent(id)}`, "DELETE");
}

// Always through the API, which checks who's asking
export function fileUrl(id: string, variant: FileVariant, download = false) {
  const query = new URLSearchParams({ variant });
  if (download) query.set("download", "1");
  return `/api/files/${encodeURIComponent(id)}/content?${query}`;
}

// The file itself (to read lab values from it on this device)
export async function fetchFileContent(id: string) {
  const failed = (status: number) =>
    new ApiError(
      status,
      "That file couldn't be opened. Check your connection and try again.",
    );
  const response = await fetch(fileUrl(id, "original")).catch(() => {
    throw failed(0);
  });
  if (!response.ok) throw failed(response.status);
  return await response.blob();
}
