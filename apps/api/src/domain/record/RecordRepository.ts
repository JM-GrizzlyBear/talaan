import type { RecordFields, RecordType } from "@talaan/shared";
import type { HealthRecord } from "./HealthRecord.js";

export interface RecordFilters {
  // undefined: everyone; null: the owner themself; a string: that profile
  profileId?: string | null;
  type?: RecordType;
}

export interface RecordRepository {
  // Not in the Trash, newest first
  listForOwner(
    ownerId: string,
    filters: RecordFilters,
  ): Promise<HealthRecord[]>;
  // Also finds records in the Trash
  findById(id: string): Promise<HealthRecord | null>;
  create(
    ownerId: string,
    fields: RecordFields,
    actorId: string,
    at: Date,
  ): Promise<HealthRecord>;
  update(
    id: string,
    fields: RecordFields,
    actorId: string,
    at: Date,
  ): Promise<HealthRecord>;
  moveToTrash(id: string, actorId: string, at: Date): Promise<void>;
  restore(id: string, actorId: string, at: Date): Promise<void>;
  listTrash(ownerId: string): Promise<HealthRecord[]>;
  // In the Trash since before this time, across every account
  listTrashedBefore(before: Date): Promise<HealthRecord[]>;
  // For good
  remove(id: string): Promise<void>;
  // Including the Trash
  countForProfile(profileId: string): Promise<number>;
}
