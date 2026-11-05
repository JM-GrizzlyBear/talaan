import { NotFoundError } from "../../domain/errors.js";
import type { RecordFileRepository } from "../../domain/file/RecordFileRepository.js";
import type { RecordRepository } from "../../domain/record/RecordRepository.js";
import { purgeCutoff } from "../../domain/record/rules.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { Clock } from "../ports/Clock.js";
import type { FileStorage } from "../ports/FileStorage.js";
import { personName, type RecordAccess } from "./RecordAccess.js";

// The Trash: records stay 30 days. Only the owner opens it, restores, or
// deletes for good; after 30 days Talaan deletes them itself.
export class RecordTrash {
  constructor(
    private readonly records: RecordRepository,
    private readonly access: RecordAccess,
    private readonly files: RecordFileRepository,
    private readonly storage: FileStorage | null,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
  ) {}

  // Deletes a record for good, then its photos and PDFs from storage.
  // A storage hiccup is logged, not shown: the record is already gone.
  private async removeWithFiles(id: string) {
    const keys = await this.files.keysForRecord(id);
    await this.records.remove(id);
    for (const key of keys) {
      try {
        await this.storage?.remove(key);
      } catch (error) {
        console.error(`Couldn't remove file ${key} from storage:`, error);
      }
    }
  }

  private async findTrashed(actorId: string, id: string) {
    const record = await this.records.findById(id);
    if (!record || !record.deletedAt) {
      throw new NotFoundError("That record isn't in the Trash anymore.");
    }
    await this.access.requireOwner(actorId, record.ownerId);
    return record;
  }

  async list(viewerId: string, ownerId: string) {
    await this.access.requireOwner(viewerId, ownerId);
    await this.purgeExpired();
    const household = await this.access.household(ownerId);
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
    await this.removeWithFiles(id);
    await this.audit.log({
      ownerId: record.ownerId,
      action: "record.deleted",
      actorId,
      recordId: id,
      subject: record.title,
    });
  }

  async empty(actorId: string) {
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
      await this.removeWithFiles(record.id);
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
}
