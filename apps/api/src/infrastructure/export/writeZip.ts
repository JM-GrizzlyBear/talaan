import { once } from "node:events";
import type { Writable } from "node:stream";
import { strToU8, Zip, ZipDeflate, ZipPassThrough } from "fflate";
import type { ExportEntry } from "../../application/account/AccountExport.js";

// Streams a ZIP to `out` one file at a time, so even a large download uses
// little memory. Photos and PDFs are stored as they are (already compressed);
// text is compressed. A file that can't be read is replaced by a note.
export async function writeZip(entries: ExportEntry[], out: Writable) {
  let failed: Error | null = null;
  let full = false;
  const zip = new Zip((error, chunk, final) => {
    if (error) {
      failed = error;
      out.destroy(error);
      return;
    }
    if (!out.write(chunk)) full = true;
    if (final) out.end();
  });
  const drain = async () => {
    if (full && !out.destroyed) {
      full = false;
      await once(out, "drain");
    }
  };
  const addText = (path: string, text: string) => {
    const file = new ZipDeflate(path, { level: 6 });
    zip.add(file);
    file.push(strToU8(text), true);
  };

  for (const entry of entries) {
    if (failed || out.destroyed) return;
    if (entry.text !== undefined) {
      addText(entry.path, entry.text);
      await drain();
      continue;
    }
    if (!entry.open) continue;
    let body;
    try {
      body = await entry.open();
    } catch (error) {
      console.error(`Couldn't add ${entry.path} to a download:`, error);
      addText(
        `${entry.path} (missing).txt`,
        "This file couldn't be read when the download was made. Try downloading again later.",
      );
      continue;
    }
    const file = new ZipPassThrough(entry.path);
    zip.add(file);
    try {
      for await (const chunk of body) {
        file.push(chunk instanceof Uint8Array ? chunk : strToU8(String(chunk)));
        await drain();
        if (out.destroyed) {
          body.destroy();
          return;
        }
      }
    } catch (error) {
      console.error(`Couldn't finish ${entry.path} in a download:`, error);
    }
    file.push(new Uint8Array(0), true);
  }
  zip.end();
}
