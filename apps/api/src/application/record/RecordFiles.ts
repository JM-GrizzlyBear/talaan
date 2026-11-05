import { FILE_LIMITS, type FileVariant } from "@talaan/shared";
import { ForbiddenError, NotFoundError } from "../../domain/errors.js";
import type { RecordFileRepository } from "../../domain/file/RecordFileRepository.js";
import { FileError, FilesNotSetUpError } from "../../domain/file/errors.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { FileStorage } from "../ports/FileStorage.js";
import type { Records } from "./Records.js";

const VIEW_ONLY =
  "You can view these records, but not change them. Ask the owner for “Can manage”.";
const GONE = "That file isn't there anymore.";

// Photos and PDFs on a record. The same rules as the record: anyone who can
// see it sees its files; the owner and "Can manage" family add and remove.
export class RecordFiles {
  constructor(
    private readonly records: Records,
    private readonly files: RecordFileRepository,
    private readonly storage: FileStorage | null,
    private readonly audit: AuditTrail,
  ) {}

  private requireStorage() {
    if (!this.storage) throw new FilesNotSetUpError();
    return this.storage;
  }

  // Files are kept under the account and the record they belong to
  private prefix(record: { ownerId: string; id: string }) {
    return `${record.ownerId}/${record.id}`;
  }

  private async forChange(actorId: string, recordId: string) {
    const access = await this.records.accessTo(actorId, recordId);
    if (!access.canChange) {
      throw new ForbiddenError(
        access.record.deletedAt
          ? "Restore the record from the Trash first."
          : VIEW_ONLY,
      );
    }
    return access.record;
  }

  async list(viewerId: string, recordId: string) {
    await this.records.accessTo(viewerId, recordId);
    return await this.files.listForRecord(recordId);
  }

  // Step 1: where the browser sends the file
  async uploadTarget(actorId: string, recordId: string) {
    const storage = this.requireStorage();
    const record = await this.forChange(actorId, recordId);
    if ((await this.files.countForRecord(recordId)) >= FILE_LIMITS.perRecord) {
      throw FileError.tooMany();
    }
    return await storage.uploadTarget(this.prefix(record));
  }

  // Step 2: the upload is checked, then attached
  async attach(
    actorId: string,
    recordId: string,
    upload: unknown,
    name: string,
  ) {
    const storage = this.requireStorage();
    const record = await this.forChange(actorId, recordId);
    const stored = await storage.confirmUpload(upload, this.prefix(record));
    if ((await this.files.countForRecord(recordId)) >= FILE_LIMITS.perRecord) {
      await storage.remove(stored.key);
      throw FileError.tooMany();
    }
    const file = await this.files.create({
      recordId,
      ownerId: record.ownerId,
      stored,
      originalName: name,
      uploadedBy: actorId,
    });
    await this.audit.log({
      ownerId: record.ownerId,
      action: "record.file_added",
      actorId,
      recordId,
      subject: record.title,
      changes: [{ field: "File", from: null, to: name }],
    });
    return file;
  }

  async open(viewerId: string, fileId: string, variant: FileVariant) {
    const storage = this.requireStorage();
    const file = await this.files.findById(fileId);
    if (!file) throw new NotFoundError(GONE);
    // Throws "not found" for anyone the record isn't shared with
    await this.records.accessTo(viewerId, file.recordId);
    const opened = await storage.open(
      { key: file.storageKey, format: file.format },
      variant,
    );
    return { file, ...opened };
  }

  async remove(actorId: string, fileId: string) {
    const storage = this.requireStorage();
    const file = await this.files.findById(fileId);
    if (!file) throw new NotFoundError(GONE);
    const record = await this.forChange(actorId, file.recordId);
    await this.files.remove(fileId);
    await storage.remove(file.storageKey);
    await this.audit.log({
      ownerId: record.ownerId,
      action: "record.file_removed",
      actorId,
      recordId: record.id,
      subject: record.title,
      changes: [{ field: "File", from: file.originalName, to: null }],
    });
  }
}
