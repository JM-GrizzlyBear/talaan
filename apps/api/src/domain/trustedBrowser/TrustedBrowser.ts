// A browser that passed two-step sign-in and was remembered, so it isn't asked
// for a code again until it expires. The browser keeps a random token; only its
// hash is stored.
export interface TrustedBrowser {
  id: string;
  userId: string;
  tokenHash: string;
  // "Chrome on Windows", for the list on the Security page
  label: string;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date;
}
