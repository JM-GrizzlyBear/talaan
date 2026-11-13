import type { PhoneFile } from "@talaan/client";

// The web preview (screenshots and tests): the browser's file picker
export type PickedFile = PhoneFile & { size?: number; blob?: Blob };

function pick(accept: string, multiple: boolean, capture = false) {
  return new Promise<PickedFile[]>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    if (capture) input.setAttribute("capture", "environment");
    input.style.display = "none";
    input.onchange = () => {
      const files = [...(input.files ?? [])].map((f) => ({
        uri: URL.createObjectURL(f),
        name: f.name,
        type: f.type || "application/octet-stream",
        size: f.size,
        blob: f,
      }));
      input.remove();
      resolve(files);
    };
    document.body.appendChild(input);
    input.click();
  });
}

export async function takePhoto() {
  return (await pick("image/*", false, true))[0] ?? null;
}
export const choosePhotos = () => pick("image/*", true);
export const chooseFiles = () =>
  pick("application/pdf,image/jpeg,image/png,image/webp", true);

export async function base64Of(file: PhoneFile) {
  const blob = await (await fetch(file.uri)).blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
