import { apiAddress } from "@talaan/client";

// The web preview: the same downloads, opened in a new tab
export const fileImage = (
  id: string,
  variant: "thumb" | "preview" | "original",
) => apiAddress(`/api/files/${id}/content?variant=${variant}`);

export async function downloadAndOpen(path: string, name: string) {
  const { url, headers } = apiAddress(path);
  const blob = await (await fetch(url, { headers })).blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

export async function openLocal(uri: string) {
  window.open(uri, "_blank");
}
