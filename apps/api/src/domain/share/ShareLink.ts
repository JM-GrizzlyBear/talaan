import type { ShareSettings } from "@talaan/shared";

export interface ShareView {
  openedAt: Date;
  device: string;
}

export interface ShareLink {
  id: string;
  ownerId: string;
  profileId: string | null;
  token: string;
  recipient: string;
  note: string;
  medicalId: boolean;
  labs: boolean;
  recordIds: string[];
  expiresAt: Date;
  maxViews: number | null;
  pinHash: string | null;
  pinFailures: number;
  pinWaitUntil: Date | null;
  alertedAt: Date | null;
  stoppedAt: Date | null;
  stoppedByName: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: Date;
  views: ShareView[];
}

export interface NewShareLink {
  ownerId: string;
  profileId: string | null;
  token: string;
  recipient: string;
  note: string;
  medicalId: boolean;
  labs: boolean;
  recordIds: string[];
  expiresAt: Date;
  maxViews: number | null;
  pinHash: string | null;
}

export interface ShareLinkRepository {
  // Newest first
  listForOwner(ownerId: string): Promise<ShareLink[]>;
  findById(id: string): Promise<ShareLink | null>;
  findByToken(token: string): Promise<ShareLink | null>;
  countOpen(ownerId: string, now: Date): Promise<number>;
  create(link: NewShareLink, actorId: string, at: Date): Promise<string>;
  // pinHash: undefined keeps the PIN
  updateSettings(
    id: string,
    settings: Omit<ShareSettings, "pin" | "expiresAt"> & {
      expiresAt: Date;
      pinHash?: string | null;
    },
    at: Date,
  ): Promise<void>;
  stop(id: string, actorId: string, at: Date): Promise<void>;
  remove(id: string): Promise<void>;
  // Wrong PIN: counts it; the caller decides when to make it wait
  setPinFailures(
    id: string,
    failures: number,
    waitUntil: Date | null,
  ): Promise<void>;
  addView(
    shareId: string,
    keyHash: string,
    device: string,
    at: Date,
  ): Promise<void>;
  hasView(shareId: string, keyHash: string): Promise<boolean>;
  // Claims the "it was opened" alert: false when one went out recently
  claimAlert(id: string, at: Date, notBefore: Date): Promise<boolean>;
}
