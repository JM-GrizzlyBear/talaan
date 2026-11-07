// Copies the free text reader (Tesseract) and the PDF reader's worker into
// public/reader/, so the website serves them itself: no other company's
// server sees that someone is reading a lab result. Runs before dev and build.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "..", "public", "reader");

const packageDir = (name, from) =>
  path.dirname(require.resolve(`${name}/package.json`, { paths: [from] }));
const tesseract = packageDir("tesseract.js", here);
const core = packageDir("tesseract.js-core", tesseract);
const english = packageDir("@tesseract.js-data/eng", here);
const pdfjs = packageDir("pdfjs-dist", here);

const files = [
  [path.join(tesseract, "dist", "worker.min.js"), "worker.min.js"],
  // The engine, in the three builds a browser may pick (newest CPUs first)
  ...["relaxedsimd-lstm", "simd-lstm", "lstm"].map((variant) => [
    path.join(core, `tesseract-core-${variant}.wasm.js`),
    `core/tesseract-core-${variant}.wasm.js`,
  ]),
  // English, the compact "best" model: accurate and under 3 MB
  [
    path.join(english, "4.0.0_best_int", "eng.traineddata.gz"),
    "lang/eng.traineddata.gz",
  ],
  [path.join(pdfjs, "build", "pdf.worker.min.mjs"), "pdf.worker.min.mjs"],
];

for (const [from, to] of files) {
  const target = path.join(out, to);
  mkdirSync(path.dirname(target), { recursive: true });
  // Skip when already there and the same size (dev restarts)
  if (existsSync(target) && statSync(target).size === statSync(from).size) {
    continue;
  }
  copyFileSync(from, target);
}
console.log(`Reader files ready in ${path.relative(process.cwd(), out)}`);
