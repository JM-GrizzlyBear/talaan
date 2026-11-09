import { createHash } from "node:crypto";
import {
  EMPTY_MEDICAL_ID,
  type FileVariant,
  shareStatus,
} from "@talaan/shared";
import { NotFoundError } from "../../domain/errors.js";
import type { RecordFileRepository } from "../../domain/file/RecordFileRepository.js";
import { FilesNotSetUpError } from "../../domain/file/errors.js";
import type { MedicalIdRepository } from "../../domain/medical/MedicalId.js";
import { toLabResults } from "../../domain/record/labResults.js";
import type { RecordRepository } from "../../domain/record/RecordRepository.js";
import { ShareError } from "../../domain/share/errors.js";
import {
  afterWrongPin,
  ALERT_GAP_MS,
  minutesUntil,
} from "../../domain/share/rules.js";
import type {
  ShareLink,
  ShareLinkRepository,
} from "../../domain/share/ShareLink.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { Clock } from "../ports/Clock.js";
import type { FileStorage } from "../ports/FileStorage.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";
import { personName, type RecordAccess } from "../record/RecordAccess.js";
import type { ShareAlerts } from "./ShareAlerts.js";

export const LINK_ENDED =
  "This link has ended or was stopped. Ask the family for a new one.";
const NO_FILE = "That file isn't part of this link.";

// Who is looking: someone signed in (family see it as a preview), and the key
// this browser got when it opened the link
export interface SharedViewer {
  userId?: string;
  viewKey?: string;
}

const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

// The doctor's side of a link: no sign-in. A PIN when there is one; each
// browser that opens it is counted and the family is told.
export class SharedPages {
  constructor(
    private readonly links: ShareLinkRepository,
    private readonly access: RecordAccess,
    private readonly records: RecordRepository,
    private readonly files: RecordFileRepository,
    private readonly medicalIds: MedicalIdRepository,
    private readonly storage: FileStorage | null,
    private readonly hasher: PasswordHasher,
    private readonly alerts: ShareAlerts,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
    // The key a browser keeps after opening a link
    private readonly makeKey: () => string,
  ) {}

  // Open, or used up (those who opened it can still look)
  private async live(token: string) {
    const link = await this.links.findByToken(token);
    const status =
      link &&
      shareStatus({ ...link, viewCount: link.views.length }, this.clock.now());
    if (!link || status === "stopped" || status === "expired") {
      throw new NotFoundError(LINK_ENDED);
    }
    return { link, status };
  }

  private async isFamily(userId: string | undefined, link: ShareLink) {
    if (!userId) return false;
    try {
      await this.access.roleFor(userId, link.ownerId);
      return true;
    } catch {
      return false;
    }
  }

  private async allowed(link: ShareLink, viewer: SharedViewer) {
    if (await this.isFamily(viewer.userId, link)) return "preview" as const;
    if (
      viewer.viewKey &&
      (await this.links.hasView(link.id, hashKey(viewer.viewKey)))
    ) {
      return "opened" as const;
    }
    return null;
  }

  // The page when this browser may see it; otherwise whether a PIN is needed
  async look(token: string, viewer: SharedViewer) {
    const { link } = await this.live(token);
    const allowed = await this.allowed(link, viewer);
    if (allowed) {
      return { page: await this.page(link, allowed === "preview") };
    }
    const now = this.clock.now();
    return {
      gate: {
        needsPin: link.pinHash !== null,
        waitUntil:
          link.pinWaitUntil && link.pinWaitUntil > now
            ? link.pinWaitUntil.toISOString()
            : null,
      },
    };
  }

  // Opening it in a new browser: checks the PIN, counts the browser, tells
  // the family. Returns the key for the browser to keep.
  async open(token: string, viewer: SharedViewer, pin: string, device: string) {
    const { link, status } = await this.live(token);
    const allowed = await this.allowed(link, viewer);
    if (allowed) {
      return { page: await this.page(link, allowed === "preview"), key: null };
    }
    const now = this.clock.now();
    if (link.pinHash) {
      if (link.pinWaitUntil && link.pinWaitUntil > now) {
        throw ShareError.wait(minutesUntil(link.pinWaitUntil, now));
      }
      const right =
        /^\d{6}$/.test(pin) && (await this.hasher.compare(pin, link.pinHash));
      if (!right) {
        const next = afterWrongPin(link.pinFailures, now);
        await this.links.setPinFailures(link.id, next.failures, next.waitUntil);
        if (next.waitUntil) {
          throw ShareError.wait(minutesUntil(next.waitUntil, now));
        }
        throw ShareError.wrongPin(next.left);
      }
      if (link.pinFailures > 0)
        await this.links.setPinFailures(link.id, 0, null);
    }
    if (status === "used") throw ShareError.usedUp();

    const key = this.makeKey();
    await this.links.addView(link.id, hashKey(key), device, now);
    const household = await this.access.household(link.ownerId);
    const name = personName(household, link.profileId);
    await this.audit.log({
      ownerId: link.ownerId,
      action: "share.opened",
      actorId: null,
      subject: link.recipient,
      changes: [{ field: "Opened on", from: null, to: device }],
    });
    if (
      await this.links.claimAlert(
        link.id,
        now,
        new Date(now.getTime() - ALERT_GAP_MS),
      )
    ) {
      await this.alerts.opened(link, { personName: name, device, at: now });
    }
    return {
      page: await this.page(link, false),
      key,
      keepFor: link.expiresAt.getTime() - now.getTime(),
    };
  }

  private async page(link: ShareLink, preview: boolean) {
    const household = await this.access.household(link.ownerId);
    const name = personName(household, link.profileId);
    const chosen = new Set(link.recordIds);
    const all = await this.records.listForOwner(link.ownerId, {
      profileId: link.profileId,
    });
    const records = all.filter((r) => chosen.has(r.id));
    const medical = link.medicalId
      ? ((await this.medicalIds.find(link.ownerId, link.profileId))?.fields ??
        EMPTY_MEDICAL_ID)
      : null;
    return {
      link,
      personName: name,
      preview,
      medicalId: medical,
      labs: link.labs
        ? toLabResults(all.filter((r) => r.type === "lab"))
        : null,
      records: await Promise.all(
        records.map(async (record) => ({
          record,
          files: await this.files.listForRecord(record.id),
        })),
      ),
    };
  }

  // A photo or PDF of a record in the link
  async openFile(
    token: string,
    viewer: SharedViewer,
    fileId: string,
    variant: FileVariant,
  ) {
    const { link } = await this.live(token);
    if (!(await this.allowed(link, viewer))) throw new NotFoundError(NO_FILE);
    if (!this.storage) throw new FilesNotSetUpError();
    const file = await this.files.findById(fileId);
    if (!file || !link.recordIds.includes(file.recordId)) {
      throw new NotFoundError(NO_FILE);
    }
    const record = await this.records.findById(file.recordId);
    if (
      !record ||
      record.deletedAt ||
      record.ownerId !== link.ownerId ||
      record.profileId !== link.profileId
    ) {
      throw new NotFoundError(NO_FILE);
    }
    const opened = await this.storage.open(
      { key: file.storageKey, format: file.format },
      variant,
    );
    return { file, ...opened };
  }
}
