import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// A PNG (as a data: address) saved, then the share sheet: "Save Image" puts
// it in Photos
export async function savePicture(dataUrl: string, name: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  await Sharing.shareAsync(file.uri, {
    mimeType: "image/png",
    UTI: "public.png",
  });
}
