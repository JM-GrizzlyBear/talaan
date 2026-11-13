import { apiAddress } from "@talaan/client";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// Pictures shown in the app come straight from the API with the token
export const fileImage = (
  id: string,
  variant: "thumb" | "preview" | "original",
) => apiAddress(`/api/files/${id}/content?variant=${variant}`);

const safe = (name: string) =>
  name.replace(/[^\w .()-]/g, "_").slice(0, 80) || "file";

// Any API download (a PDF, the ZIP of your data, a printed page) saved to
// the phone's cache, then opened: the phone's viewer, or Save / Share
export async function downloadAndOpen(
  path: string,
  name: string,
  mime?: string,
) {
  const { url, headers } = apiAddress(path);
  const dir = new Directory(Paths.cache, "talaan-open");
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, safe(name));
  const file = await File.downloadFileAsync(url, target, {
    headers,
    idempotent: true,
  });
  await openLocal(file.uri, mime);
}

// A file already on the phone (a PDF the app made)
export async function openLocal(uri: string, mime?: string) {
  const file = new File(uri);
  try {
    if (await File.canPreview(file)) {
      await File.preview(file);
      return;
    }
  } catch {
    // No viewer: share instead
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: mime });
  }
}
