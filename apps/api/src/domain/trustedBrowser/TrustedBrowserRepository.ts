import type { TrustedBrowser } from "./TrustedBrowser.js";

export interface TrustedBrowserRepository {
  create(
    browser: Pick<
      TrustedBrowser,
      "userId" | "tokenHash" | "label" | "expiresAt"
    >,
  ): Promise<TrustedBrowser>;
  find(id: string): Promise<TrustedBrowser | null>;
  touch(id: string, at: Date): Promise<void>;
  listActive(userId: string, now: Date): Promise<TrustedBrowser[]>;
  // false when there's no such browser for this person
  remove(id: string, userId: string): Promise<boolean>;
  removeAll(userId: string): Promise<void>;
}
