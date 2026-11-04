// A "forgot password" code waiting to be used. Only a keyed hash of the digits is kept.
export interface ResetCode {
  userId: string;
  codeHash: string;
  expiresAt: Date;
  tries: number;
}
