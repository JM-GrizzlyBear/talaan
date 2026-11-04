// Makes the 6-digit email codes and the long random tokens (remembered browsers),
// and the hashes that are stored instead of them
export interface SecretCodes {
  newCode(): string;
  hash(code: string, userId: string): string;
  // Compares in constant time, so timing can't reveal how close a guess was
  matches(code: string, userId: string, codeHash: string): boolean;
  // 32 random bytes, safe to put in a cookie
  newToken(): string;
  hashToken(token: string): string;
  tokenMatches(token: string, tokenHash: string): boolean;
}
