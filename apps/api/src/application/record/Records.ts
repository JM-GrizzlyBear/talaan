import {
  fullName,
  type RecordFields,
  type RecordRole,
  type RecordType,
} from "@talaan/shared";
import { ForbiddenError, NotFoundError } from "../../domain/errors.js";
import type { FamilyAccessRepository } from "../../domain/family/FamilyAccessRepository.js";
import type { FamilyProfile } from "../../domain/family/FamilyProfile.js";
import type { FamilyProfileRepository } from "../../domain/family/FamilyProfileRepository.js";
import { canManage, canView } from "../../domain/family/rules.js";
import type { HealthRecord } from "../../domain/record/HealthRecord.js";
import type { RecordRepository } from "../../domain/record/RecordRepository.js";
import { diffRecords, purgeCutoff } from "../../domain/record/rules.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { FamilyMembers } from "../family/FamilyMembers.js";
import type { Clock } from "../ports/Clock.js";

const NOT_FOUND =
  "That record isn't there anymore, or it isn't shared with you.";
const VIEW_ONLY =
  "You can view these records, but not change them. Ask the owner for “Can manage”.";
const OWNER_ONLY = "Only the owner of these records can do that.";

// The people in one account: the owner and their family profiles
interface Household {
  ownerId: string;
  ownerName: string;
  profiles: FamilyProfile[];
}

function personName(household: Household, profileId: string | null) {
  if (profileId === null) return household.ownerName;
  const profile = household.profiles.find((p) => p.id === profileId);
  return profile ? fullName(profile) : "Someone removed";
}

// Health records: adding, editing, the Trash, and their history.
// Who may do what comes from family sharing (FamilyMembers.roleFor).
export class Records {
  constructor(
    private readonly records: RecordRepository,
    private readonly profiles: FamilyProfileRepository,
    private readonly users: UserRepository,
    private readonly access: FamilyAccessRepository,
    private readonly members: FamilyMembers,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
  ) {}

  private async household(ownerId: string): Promise<Household> {
    const owner = await this.users.findById(ownerId);
    if (!owner) throw new NotFoundError(NOT_FOUND);
    return {
      ownerId,
      ownerName: fullName(owner),
      profiles: await this.profiles.listForOwners([ownerId]),
    };
  }

  // Throws NotFound when the viewer can't see this account at all
  private async roleFor(viewerId: string, ownerId: string) {
    const role = await this.members.roleFor(viewerId, ownerId);
    if (!canView(role)) throw new NotFoundError(NOT_FOUND);
    return role as RecordRole;
  }

  private async requireManage(viewerId: string, ownerId: string) {
    const role = await this.roleFor(viewerId, ownerId);
    if (!canManage(role)) throw new ForbiddenError(VIEW_ONLY);
    return role;
  }

  private async requireOwner(viewerId: string, ownerId: string) {
    const role = await this.roleFor(viewerId, ownerId);
    if (role !== "owner") throw new ForbiddenError(OWNER_ONLY);
  }

  // A record outside the Trash that the viewer can see
  private async findVisible(viewerId: string, id: string) {
    const record = await this.records.findById(id);
    if (!record || record.deletedAt) throw new NotFoundError(NOT_FOUND);
    const role = await this.roleFor(viewerId, record.ownerId);
    return { record, role };
  }

  private requireOwnProfile(household: Household, profileId: string | null) {
    if (
      profileId !== null &&
      !household.profiles.some((p) => p.id === profileId)
    ) {
      throw new NotFoundError("That person isn't in these records anymore.");
    }
  }

  // Every account the viewer can open: their own first, then shared ones
  async accounts(viewerId: string) {
    const owners = await this.access.listOwners(viewerId);
    const ids = [viewerId, ...owners.map((o) => o.ownerId)];
    const households = await Promise.all(ids.map((id) => this.household(id)));
    return households.map((household, index) => ({
      household,
      role: (index === 0 ? "owner" : owners[index - 1].access) as RecordRole,
    }));
  }

  async list(
    viewerId: string,
    ownerId: string,
    filters: { profileId?: string | null; type?: RecordType },
  ) {
    const role = await this.roleFor(viewerId, ownerId);
    const household = await this.household(ownerId);
    const records = await this.records.listForOwner(ownerId, filters);
    return {
      role,
      records: records.map((record) => ({
        record,
        personName: personName(household, record.profileId),
      })),
    };
  }

  async get(viewerId: string, id: string) {
    const { record, role } = await this.findVisible(viewerId, id);
    const household = await this.household(record.ownerId);
    return {
      record,
      role,
      personName: personName(household, record.profileId),
    };
  }

  async create(actorId: string, ownerId: string, fields: RecordFields) {
    await this.requireManage(actorId, ownerId);
    const household = await this.household(ownerId);
    this.requireOwnProfile(household, fields.profileId);
    const record = await this.records.create(
      ownerId,
      fields,
      actorId,
      this.clock.now(),
    );
    await this.audit.log({
      ownerId,
      action: "record.created",
      actorId,
      recordId: record.id,
      subject: record.title,
    });
    return record;
  }

  async update(actorId: string, id: string, fields: RecordFields) {
    const { record } = await this.findVisible(actorId, id);
    await this.requireManage(actorId, record.ownerId);
    const household = await this.household(record.ownerId);
    this.requireOwnProfile(household, fields.profileId);

    const changes = diffRecords(record, fields, (profileId) =>
      personName(household, profileId),
    );
    // Nothing changed: nothing saved, nothing in the history
    if (changes.length === 0) return record;
    const updated = await this.records.update(
      id,
      fields,
      actorId,
      this.clock.now(),
    );
    await this.audit.log({
      ownerId: record.ownerId,
      action: "record.edited",
      actorId,
      recordId: id,
      subject: updated.title,
      changes,
    });
    return updated;
  }

  // Owners and "Can manage" family. The owner can restore it for 30 days.
  async moveToTrash(actorId: string, id: string) {
    const { record } = await this.findVisible(actorId, id);
    await this.requireManage(actorId, record.ownerId);
    await this.records.moveToTrash(id, actorId, this.clock.now());
    await this.audit.log({
      ownerId: record.ownerId,
      action: "record.trashed",
      actorId,
      recordId: id,
      subject: record.title,
    });
  }

  // A record in the Trash that only its owner may restore or delete for good
  private async findTrashed(actorId: string, id: string) {
    const record = await this.records.findById(id);
    if (!record || !record.deletedAt) {
      throw new NotFoundError("That record isn't in the Trash anymore.");
    }
    await this.requireOwner(actorId, record.ownerId);
    return record;
  }

  async listTrash(viewerId: string, ownerId: string) {
    await this.requireOwner(viewerId, ownerId);
    await this.purgeExpired();
    const household = await this.household(ownerId);
    const records = await this.records.listTrash(ownerId);
    return records.map((record) => ({
      record,
      personName: personName(household, record.profileId),
    }));
  }

  // Only the owner. Restoring needs someone who can always undo mistakes.
  async restore(actorId: string, id: string) {
    const record = await this.findTrashed(actorId, id);
    await this.records.restore(id, actorId, this.clock.now());
    await this.audit.log({
      ownerId: record.ownerId,
      action: "record.restored",
      actorId,
      recordId: id,
      subject: record.title,
    });
  }

  // Only the owner, and only from the Trash. The history stays.
  async deleteForever(actorId: string, id: string) {
    const record = await this.findTrashed(actorId, id);
    await this.records.remove(id);
    await this.audit.log({
      ownerId: record.ownerId,
      action: "record.deleted",
      actorId,
      recordId: id,
      subject: record.title,
    });
  }

  async emptyTrash(actorId: string) {
    const trashed = await this.records.listTrash(actorId);
    for (const record of trashed) await this.deleteForever(actorId, record.id);
    return trashed.length;
  }

  // Records in the Trash for 30 days are deleted for good, by Talaan itself
  async purgeExpired() {
    const due = await this.records.listTrashedBefore(
      purgeCutoff(this.clock.now()),
    );
    for (const record of due) {
      await this.records.remove(record.id);
      await this.audit.log({
        ownerId: record.ownerId,
        action: "record.purged",
        actorId: null,
        recordId: record.id,
        subject: record.title,
      });
    }
    return due.length;
  }

  // A record's history. Anyone who can see the record sees its history;
  // for a record in the Trash, only the owner.
  async history(viewerId: string, id: string) {
    const record = await this.records.findById(id);
    if (!record) throw new NotFoundError(NOT_FOUND);
    const role = await this.roleFor(viewerId, record.ownerId);
    if (record.deletedAt && role !== "owner")
      throw new NotFoundError(NOT_FOUND);
    return await this.audit.forRecord(id);
  }

  // Everything that happened in the viewer's own account
  async activity(viewerId: string, options: { limit: number; before?: Date }) {
    return await this.audit.forOwner(viewerId, options);
  }
}

export type { HealthRecord };
