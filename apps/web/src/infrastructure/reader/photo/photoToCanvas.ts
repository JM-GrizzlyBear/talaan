import { ReaderError } from "../ReaderError";

// Big photos are slower and no clearer to the reader
export const MAX_SIDE = 2400;

// A photo on a canvas, upright (phones store rotation separately) and not too big
export async function photoToCanvas(photo: Blob) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" });
  } catch {
    throw new ReaderError(
      /heic|heif/i.test(photo.type)
        ? "This browser can't open HEIC photos. Open it in Safari, or save it as a JPG and try again."
        : "This photo couldn't be opened. Try another photo, or save it as a JPG.",
    );
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}
