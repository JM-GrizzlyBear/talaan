import type { PhoneFile } from "@talaan/client";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// Photos and PDFs from the phone: the camera, the photo library, or files.
// Photos are made smaller first (like the website: at most 2400 px across),
// so they upload and read faster.

export type PickedFile = PhoneFile & { size?: number };

const MAX_SIDE = 2400;

async function shrink(uri: string, width?: number, height?: number) {
  const big = Math.max(width ?? 0, height ?? 0);
  const context = ImageManipulator.manipulate(uri);
  if (big > MAX_SIDE) {
    context.resize(
      (width ?? 0) >= (height ?? 0)
        ? { width: MAX_SIDE }
        : { height: MAX_SIDE },
    );
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    compress: 0.85,
    format: SaveFormat.JPEG,
  });
  return saved.uri;
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

export async function takePhoto(): Promise<PickedFile | null> {
  const allowed = await ImagePicker.requestCameraPermissionsAsync();
  if (!allowed.granted) {
    throw new Error(
      "Talaan can't use the camera. Allow it in the phone's Settings → Talaan (or Expo Go).",
    );
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 1,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const uri = await shrink(asset.uri, asset.width, asset.height);
  return {
    uri,
    name: `photo-${stamp()}.jpg`,
    type: "image/jpeg",
    size: sizeOf(uri),
  };
}

export async function choosePhotos(): Promise<PickedFile[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    quality: 1,
  });
  if (result.canceled) return [];
  return await Promise.all(
    result.assets.map(async (asset, i) => {
      const uri = await shrink(asset.uri, asset.width, asset.height);
      const base = (asset.fileName ?? `photo-${stamp()}-${i + 1}`).replace(
        /\.[^.]+$/,
        "",
      );
      return {
        uri,
        name: `${base}.jpg`,
        type: "image/jpeg",
        size: sizeOf(uri),
      };
    }),
  );
}

export async function chooseFiles(): Promise<PickedFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
    ],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return await Promise.all(
    result.assets.map(async (asset) => {
      const type = asset.mimeType ?? "application/octet-stream";
      if (type.startsWith("image/") && type !== "image/heic") {
        const uri = await shrink(asset.uri);
        return {
          uri,
          name: asset.name.replace(/\.[^.]+$/, ".jpg"),
          type: "image/jpeg",
          size: sizeOf(uri),
        };
      }
      return {
        uri: asset.uri,
        name: asset.name,
        type,
        size: asset.size ?? undefined,
      };
    }),
  );
}

function sizeOf(uri: string) {
  try {
    return new File(uri).size ?? undefined;
  } catch {
    return undefined;
  }
}

// The file's bytes as base64 (for the reader)
export async function base64Of(file: PhoneFile) {
  return await new File(file.uri).base64();
}
