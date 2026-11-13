import type { UploadTarget } from "@talaan/shared";
import { apiAddress, ApiError } from "./http";

// A file to upload: a browser File, or a picture or PDF on the phone
// ({ uri, name, type }, from the camera or the file picker)
export type PhoneFile = { uri: string; name: string; type: string };
export type UploadFile = (Blob & { name?: string }) | PhoneFile;

export const isPhoneFile = (file: UploadFile): file is PhoneFile =>
  typeof (file as PhoneFile).uri === "string";

export const fileName = (file: UploadFile) =>
  (isPhoneFile(file) ? file.name : file.name) || "photo.jpg";

// Sends the file where the API said (straight to Cloudinary on the live site,
// or to the API itself without Cloudinary), reporting progress from 0 to 1
export async function sendToStorage(
  target: UploadTarget,
  file: UploadFile,
  onProgress: (fraction: number) => void,
) {
  // Without Cloudinary the target is the API itself (a path): the app needs
  // the server's address and its token
  const local = target.url.startsWith("/");
  const { url, headers } = local
    ? apiAddress(target.url)
    : { url: target.url, headers: {} as Record<string, string> };
  // Sent as the whole body (no form): the phone's file is read first
  // (A file that carries its own Blob, like the app's web preview, sends it)
  const own = (file as { blob?: Blob }).blob;
  const raw = target.fileField
    ? null
    : (own ??
      (isPhoneFile(file) ? await (await fetch(file.uri)).blob() : file));

  return await new Promise<unknown>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, url);
    xhr.responseType = "json";
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
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
      // A phone file goes in as { uri, name, type }: React Native reads it
      form.append(target.fileField, own ?? (file as Blob));
      xhr.send(form);
    } else {
      const blob = raw as Blob;
      xhr.setRequestHeader(
        "Content-Type",
        blob.type || "application/octet-stream",
      );
      xhr.send(blob);
    }
  });
}
