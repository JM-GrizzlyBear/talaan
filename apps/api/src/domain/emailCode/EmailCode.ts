// A 6-digit code we emailed (Forgot password or two-step sign-in), waiting to be used. Only a keyed hash of the digits is kept.
export interface EmailCode {
  userId: string;
  codeHash: string;
  expiresAt: Date;
  tries: number;
}
