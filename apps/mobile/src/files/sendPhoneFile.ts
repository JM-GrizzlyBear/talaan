import type { PhoneUpload } from "@talaan/client";
import { File, UploadType } from "expo-file-system";

// Sends a photo or PDF on the phone with the phone's own uploader (Android's
// and iOS's), which reports real progress and doesn't hang like
// XMLHttpRequest with a form can in Expo Go
export async function sendPhoneFile(upload: PhoneUpload) {
  const file = new File(upload.uri);
  // (An older Expo Go without the uploader: the usual way is used)
  if (typeof file.upload !== "function") return null;
  const multipart = upload.fileField !== null;
  const method = upload.method === "PUT" ? "PUT" : "POST";
  const answer = await file.upload(upload.url, {
    httpMethod: method,
    uploadType: multipart ? UploadType.MULTIPART : UploadType.BINARY_CONTENT,
    headers: multipart
      ? upload.headers
      : { ...upload.headers, "Content-Type": upload.type },
    ...(multipart
      ? {
          fieldName: upload.fileField ?? "file",
          mimeType: upload.type,
          parameters: upload.fields,
        }
      : {}),
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0)
        upload.onProgress(Math.min(1, bytesSent / totalBytes));
    },
  });
  return { status: answer.status, body: answer.body };
}
