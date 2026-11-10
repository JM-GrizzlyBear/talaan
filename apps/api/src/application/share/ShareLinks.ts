import {
  type NewShare,
  SHARE_LIMITS,
  type ShareSettings,
  shareStatus,
} from "@talaan/shared";
import { NotFoundError } from "../../domain/errors.js";
import type { RecordRepository } from "../../domain/record/RecordRepository.js";
import { ShareFormError } from "../../domain/share/errors.js";
import { checkExpiry } from "../../domain/share/rules.js";
import type {
  ShareLink,
  ShareLinkRepository,
} from "../../domain/share/ShareLink.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { Clock } from "../ports/Clock.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";
import { personName, type RecordAccess } from "../record/RecordAccess.js";

const GONE = "That link isn't there anymore.";

// "Nov 17, 2026, 10:00 AM" (Philippine time), for the activity history
const when = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);

// Links for doctors. Owners and "Can manage" family make, change and stop
// them; "Can view" family can't share what isn't theirs to share.
export class ShareLinks {
  constructor(
    private readonly links: ShareLinkRepository,
    private readonly access: RecordAccess,
    private readonly records: RecordRepository,
    private readonly hasher: PasswordHasher,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
    // A long random code for the link
    private readonly makeToken: () => string,
  ) {}

  // The link with whose it is and the records still in it
  private async describe(links: ShareLink[], ownerId: string) {
    const household = await this.access.household(ownerId);
    const records = new Map(
      (await this.records.listForOwner(ownerId, {})).map((r) => [r.id, r]),
    );
    return links.map((link) => ({
      link,
      personName: personName(household, link.profileId),
      records: link.recordIds.flatMap((id) => {
        const r = records.get(id);
        return r && r.profileId === link.profileId ? [r] : [];
      }),
      status: shareStatus(
        { ...link, viewCount: link.views.length },
        this.clock.now(),
      ),
    }));
  }

  private async mine(actorId: string, id: string) {
    const link = await this.links.findById(id);
    if (!link) throw new NotFoundError(GONE);
    // "Not found" for anyone it isn't theirs to manage
    try {
      await this.access.requireManage(actorId, link.ownerId);
    } catch {
      throw new NotFoundError(GONE);
    }
    return link;
  }

  async list(viewerId: string, ownerId: string) {
    await this.access.requireManage(viewerId, ownerId);
    return await this.describe(await this.links.listForOwner(ownerId), ownerId);
  }

  async get(viewerId: string, id: string) {
    const link = await this.mine(viewerId, id);
    return (await this.describe([link], link.ownerId))[0];
  }

  async create(actorId: string, ownerId: string, input: NewShare) {
    await this.access.requireManage(actorId, ownerId);
    const household = await this.access.household(ownerId);
    const profileId = input.profileId === "self" ? null : input.profileId;
    this.access.requireOwnProfile(household, profileId);
    const now = this.clock.now();
    const expiresAt = new Date(input.expiresAt);
    checkExpiry(expiresAt, now);

    const theirs = new Set(
      (await this.records.listForOwner(ownerId, { profileId })).map(
        (r) => r.id,
      ),
    );
    const recordIds = [...new Set(input.recordIds)];
    if (recordIds.some((id) => !theirs.has(id))) {
      throw new ShareFormError(
        "Some of those records aren't there anymore. Please choose again.",
        "recordIds",
      );
    }
    if ((await this.links.countOpen(ownerId, now)) >= SHARE_LIMITS.open) {
      throw new ShareFormError(
        `There are already ${SHARE_LIMITS.open} open links. Stop some you don't need first.`,
      );
    }

    const id = await this.links.create(
      {
        ownerId,
        profileId,
        token: this.makeToken(),
        recipient: input.recipient,
        note: input.note,
        medicalId: input.medicalId,
        labs: input.labs,
        recordIds,
        expiresAt,
        maxViews: input.maxViews,
        pinHash: input.pin ? await this.hasher.hash(input.pin) : null,
      },
      actorId,
      now,
    );
    const what = [
      input.medicalId && "Medical ID",
      input.labs && "lab results",
      recordIds.length > 0 &&
        `${recordIds.length} ${recordIds.length === 1 ? "record" : "records"}`,
    ].filter(Boolean);
    await this.audit.log({
      ownerId,
      action: "share.created",
      actorId,
      subject: input.recipient,
      changes: [
        { field: "For", from: null, to: personName(household, profileId) },
        { field: "Shares", from: null, to: what.join(", ") },
        { field: "Until", from: null, to: when(expiresAt) },
        { field: "PIN", from: null, to: input.pin ? "Yes" : "No" },
      ],
    });
    return id;
  }

  async update(actorId: string, id: string, settings: ShareSettings) {
    const link = await this.mine(actorId, id);
    if (link.stoppedAt) {
      throw new ShareFormError("This link was stopped. Make a new one.");
    }
    const now = this.clock.now();
    const expiresAt = new Date(settings.expiresAt);
    checkExpiry(expiresAt, now);
    await this.links.updateSettings(
      id,
      {
        expiresAt,
        maxViews: settings.maxViews,
        pinHash:
          settings.pin === undefined
            ? undefined
            : settings.pin
              ? await this.hasher.hash(settings.pin)
              : null,
      },
      now,
    );
    const changes = [];
    if (expiresAt.getTime() !== link.expiresAt.getTime()) {
      changes.push({
        field: "Until",
        from: when(link.expiresAt),
        to: when(expiresAt),
      });
    }
    if (settings.maxViews !== link.maxViews) {
      const opens = (n: number | null) => (n === null ? "No limit" : `${n}`);
      changes.push({
        field: "Most opens",
        from: opens(link.maxViews),
        to: opens(settings.maxViews),
      });
    }
    if (settings.pin !== undefined) {
      changes.push({
        field: "PIN",
        from: link.pinHash ? "Yes" : "No",
        to: settings.pin ? (link.pinHash ? "New PIN" : "Yes") : "No",
      });
    }
    if (changes.length > 0) {
      await this.audit.log({
        ownerId: link.ownerId,
        action: "share.changed",
        actorId,
        subject: link.recipient,
        changes,
      });
    }
  }

  async stop(actorId: string, id: string) {
    const link = await this.mine(actorId, id);
    if (link.stoppedAt) return;
    await this.links.stop(id, actorId, this.clock.now());
    await this.audit.log({
      ownerId: link.ownerId,
      action: "share.stopped",
      actorId,
      subject: link.recipient,
    });
  }

  // Off the list. Only once it has ended, so nothing disappears while open.
  async remove(actorId: string, id: string) {
    const link = await this.mine(actorId, id);
    const status = shareStatus(
      { ...link, viewCount: link.views.length },
      this.clock.now(),
    );
    if (status !== "stopped" && status !== "expired") {
      throw new ShareFormError("Stop the link first.");
    }
    await this.links.remove(id);
  }
}
