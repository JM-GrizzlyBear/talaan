// A passkey: the device keeps the private key (unlocked by Face ID, a fingerprint,
// Windows Hello, …). Talaan keeps only the public key to check signatures.
export interface Passkey {
  id: string;
  userId: string;
  // The id the device gives the key (base64url)
  credentialId: string;
  publicKey: Uint8Array;
  // Goes up every time the key is used; a copied key would fall behind
  counter: number;
  transports: string[];
  // "singleDevice" or "multiDevice" (synced, for example through iCloud Keychain)
  deviceType: string;
  backedUp: boolean;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export type NewPasskey = Omit<Passkey, "id" | "createdAt" | "lastUsedAt">;
