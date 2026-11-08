import { eraseTableLines } from "./eraseTableLines";

// Getting a photo ready for the text reader. Table borders and small print
// are what trip it up most, so the picture is made bigger, grey, and the long
// straight lines of a table are painted white. The person still sees the
// original photo; only the reader gets this copy.

// Text this small (the picture's longest side) is made bigger first
const SMALL_SIDE = 1800;
const MAX_SCALE = 3;

// A cleaned copy of the picture for the reader
export function cleanForReading(picture: HTMLCanvasElement, maxSide: number) {
  const longest = Math.max(picture.width, picture.height);
  const scale =
    longest < SMALL_SIDE ? Math.min(MAX_SCALE, maxSide / longest) : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(picture.width * scale);
  canvas.height = Math.round(picture.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return picture;
  context.imageSmoothingQuality = "high";
  context.drawImage(picture, 0, 0, canvas.width, canvas.height);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  const grey = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0; i < grey.length; i++) {
    grey[i] =
      0.299 * pixels[i * 4] +
      0.587 * pixels[i * 4 + 1] +
      0.114 * pixels[i * 4 + 2];
  }
  const clean = eraseTableLines(grey, canvas.width, canvas.height);
  for (let i = 0; i < clean.length; i++) {
    pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = clean[i];
    pixels[i * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}
