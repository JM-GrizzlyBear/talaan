import type { NewPasskey, Passkey } from "./Passkey.js";

export interface PasskeyRepository {
  listForUser(userId: string): Promise<Passkey[]>;
  findByCredentialId(credentialId: string): Promise<Passkey | null>;
  create(passkey: NewPasskey): Promise<Passkey>;
  recordUse(id: string, counter: number, at: Date): Promise<void>;
  // false when there's no such passkey for this person
  remove(id: string, userId: string): Promise<boolean>;
}
