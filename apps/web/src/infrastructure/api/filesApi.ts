import type { FileVariant, RecordFileInfo, UploadTarget } from "@talaan/shared";
import { ApiError, request } from "./http";

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

// Sends the file where the API said (straight to Cloudinary on the live site),
// reporting progress from 0 to 1
function send(
  target: UploadTarget,
  file: File,
  onProgress: (fraction: number) => void,
) {
  return new Promise<unknown>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, target.url);
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onerror = () =>
      reject(
        new ApiError(
          0,
          "The upload stopped. Check your connection and try again.",
        ),
      );
    xhr.onload = () => {
      const body = xhr.response as {
        message?: string;
        error?: { message?: string };
      } | null;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
        return;
      }
      // Talaan answers { message }, Cloudinary { error: { message } }
      const message =
        body?.message ??
        (body?.error?.message
          ? `The file couldn't be stored: ${body.error.message}`
          : `The upload failed (${xhr.status}). Please try again.`);
      reject(new ApiError(xhr.status, message));
    };
    if (target.fileField) {
      const form = new FormData();
      for (const [key, value] of Object.entries(target.fields)) {
        form.append(key, value);
      }
      form.append(target.fileField, file);
      xhr.send(form);
    } else {
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      );
      xhr.send(file);
    }
  });
}

// The three steps: where to send it, sending it, attaching it to the record
export async function uploadRecordFile(
  recordId: string,
  file: File,
  onProgress: (fraction: number) => void,
) {
  const target = await uploadTarget(recordId);
  const answer = await send(target, file, onProgress);
  const data = await request<{ file: RecordFileInfo }>(
    `/api/records/${encodeURIComponent(recordId)}/files`,
    "POST",
    { upload: answer, name: file.name || "photo.jpg" },
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
