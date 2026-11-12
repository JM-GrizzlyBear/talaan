import { files } from "./files";
import { randomBytes } from "./random";
import { keyFromText, keyToText, seal, unseal } from "./sealed";
import { secure } from "./secure";

// Copies of what was last seen (records, the Medical ID), for when there's no
// internet. Encrypted with a key in secure storage; wiped when signing out.
const KEY_NAME = "talaan.offlineKey";
let key: Uint8Array | null = null;

async function cacheKey() {
  if (key) return key;
  const saved = await secure.get(KEY_NAME);
  if (saved) {
    key = keyFromText(saved);
    return key;
  }
  key = randomBytes(32);
  await secure.set(KEY_NAME, keyToText(key));
  return key;
}

export interface Saved<T> {
  value: T;
  savedAt: string;
}

export const offline = {
  async save(name: string, value: unknown) {
    try {
      const k = await cacheKey();
      await files.write(
        name,
        seal({ value, savedAt: new Date().toISOString() }, k, randomBytes),
      );
    } catch {
      // A full phone or a storage error: the app still works online
    }
  },
  async load<T>(name: string): Promise<Saved<T> | null> {
    try {
      const text = await files.read(name);
      return text ? unseal<Saved<T>>(text, await cacheKey()) : null;
    } catch {
      return null;
    }
  },
  async wipe() {
    await files.clear();
    await secure.remove(KEY_NAME);
    key = null;
  },
};
