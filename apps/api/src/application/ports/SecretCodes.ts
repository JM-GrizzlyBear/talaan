// Makes the 6-digit reset codes, and the hashes that are stored instead of them
export interface SecretCodes {
  newCode(): string;
  hash(code: string, userId: string): string;
  // Compares in constant time, so timing can't reveal how close a guess was
  matches(code: string, userId: string, codeHash: string): boolean;
}
