import { gcm } from "@noble/ciphers/aes.js";

// Health records kept on the phone for offline use are encrypted (AES-256-GCM)
// with a key that lives in the phone's secure storage (Keychain / Keystore)

const toBase64 = (bytes: Uint8Array) => {
  let text = "";
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text);
};
const fromBase64 = (text: string) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function seal(
  value: unknown,
  key: Uint8Array,
  randomBytes: (n: number) => Uint8Array,
) {
  const nonce = randomBytes(12);
  const sealed = gcm(key, nonce).encrypt(encoder.encode(JSON.stringify(value)));
  return `${toBase64(nonce)}.${toBase64(sealed)}`;
}

// null when it can't be opened (another key, or changed)
export function unseal<T>(text: string, key: Uint8Array): T | null {
  try {
    const [nonce, sealed] = text.split(".");
    const plain = gcm(key, fromBase64(nonce)).decrypt(fromBase64(sealed));
    return JSON.parse(decoder.decode(plain)) as T;
  } catch {
    return null;
  }
}

export const keyToText = toBase64;
export const keyFromText = fromBase64;
