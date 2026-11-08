import type { UploadTarget } from "@talaan/shared";
import { ApiError } from "./http";

// Sends the file where the API said (straight to Cloudinary on the live site),
// reporting progress from 0 to 1
export function sendToStorage(
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
