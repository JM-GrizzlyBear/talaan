// Getting a photo ready for the text reader. Table borders and small print
// are what trip it up most, so the picture is made bigger, grey, and the long
// straight lines of a table are painted white. The person still sees the
// original photo; only the reader gets this copy.

// Text this small (the picture's longest side) is made bigger first
const SMALL_SIDE = 1800;
const MAX_SCALE = 3;

// Grey levels: darker than INK is ink; a line's soft edge is lighter
const INK = 140;
const EDGE = 210;

// Grey values (0 black … 255 white), one per pixel, row by row
export function eraseTableLines(
  grey: Uint8ClampedArray,
  width: number,
  height: number,
) {
  // Longer than any letter: a table line or an underline
  const minAcross = Math.max(40, Math.round(width * 0.12));
  const minDown = Math.max(60, Math.round(height * 0.03));
  const line = new Uint8Array(width * height);

  const markRuns = (
    count: number,
    length: number,
    at: (i: number, j: number) => number,
    min: number,
  ) => {
    for (let i = 0; i < count; i++) {
      let start = -1;
      for (let j = 0; j <= length; j++) {
        const dark = j < length && grey[at(i, j)] < INK;
        if (dark && start < 0) start = j;
        if (!dark && start >= 0) {
          if (j - start >= min) {
            for (let k = start; k < j; k++) line[at(i, k)] = 1;
          }
          start = -1;
        }
      }
    }
  };
  markRuns(height, width, (y, x) => y * width + x, minAcross);
  markRuns(width, height, (x, y) => y * width + x, minDown);

  // White out the lines and their soft edges (one pixel either side)
  const out = new Uint8ClampedArray(grey);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!line[y * width + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
          const n = ny * width + nx;
          if (line[n] || grey[n] < EDGE) out[n] = 255;
        }
      }
    }
  }
  return out;
}

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
