import type { RecordFields, RecordRole, RecordType } from "@talaan/shared";
import type { FamilyAccessRepository } from "../../domain/family/FamilyAccessRepository.js";
import type { RecordRepository } from "../../domain/record/RecordRepository.js";
import { diffRecords } from "../../domain/record/diff.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { Clock } from "../ports/Clock.js";
import { personName, type RecordAccess } from "./RecordAccess.js";

// Health records: adding, viewing, editing, moving to the Trash, and history.
// The Trash itself (restoring, deleting for good) is RecordTrash.
export class Records {
  constructor(
    private readonly records: RecordRepository,
    private readonly access: RecordAccess,
    private readonly sharing: FamilyAccessRepository,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
  ) {}

  // Every account the viewer can open: their own first, then shared ones
  async accounts(viewerId: string) {
    const owners = await this.sharing.listOwners(viewerId);
    const ids = [viewerId, ...owners.map((o) => o.ownerId)];
    const households = await Promise.all(
      ids.map((id) => this.access.household(id)),
    );
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
    const role = await this.access.roleFor(viewerId, ownerId);
    const household = await this.access.household(ownerId);
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
    const { record, role } = await this.access.findVisible(viewerId, id);
    const household = await this.access.household(record.ownerId);
    return {
      record,
      role,
      personName: personName(household, record.profileId),
    };
  }

  async create(actorId: string, ownerId: string, fields: RecordFields) {
    await this.access.requireManage(actorId, ownerId);
    const household = await this.access.household(ownerId);
    this.access.requireOwnProfile(household, fields.profileId);
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
    const { record } = await this.access.findVisible(actorId, id);
    await this.access.requireManage(actorId, record.ownerId);
    const household = await this.access.household(record.ownerId);
    this.access.requireOwnProfile(household, fields.profileId);

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
    const { record } = await this.access.findVisible(actorId, id);
    await this.access.requireManage(actorId, record.ownerId);
    await this.records.moveToTrash(id, actorId, this.clock.now());
    await this.audit.log({
      ownerId: record.ownerId,
      action: "record.trashed",
      actorId,
      recordId: id,
      subject: record.title,
    });
  }

  // A record's history. Anyone who can see the record sees its history;
  // for a record in the Trash, only the owner.
  async history(viewerId: string, id: string) {
    await this.access.accessTo(viewerId, id);
    return await this.audit.forRecord(id);
  }

  // Everything that happened in the viewer's own account
  async activity(viewerId: string, options: { limit: number; before?: Date }) {
    return await this.audit.forOwner(viewerId, options);
  }
}
