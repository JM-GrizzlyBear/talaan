import {
  fullName,
  type RecordAccountInfo,
  type RecordInfo,
  type RecordRole,
  type RecordSummary,
  type TrashedRecordInfo,
} from "@talaan/shared";
import type { FamilyProfile } from "../../../domain/family/FamilyProfile.js";
import type { HealthRecord } from "../../../domain/record/HealthRecord.js";
import { outOfRangeCount, purgeAt } from "../../../domain/record/rules.js";

// Domain objects → what the browser receives (dates as ISO strings, no internal fields)

export function recordSummaryJson(
  record: HealthRecord,
  personName: string,
): RecordSummary {
  return {
    id: record.id,
    ownerId: record.ownerId,
    profileId: record.profileId,
    personName,
    type: record.type,
    title: record.title,
    recordDate: record.recordDate,
    facility: record.facility,
    doctor: record.doctor,
    outOfRange: outOfRangeCount(record),
    fileCount: record.fileCount,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function recordJson(
  record: HealthRecord,
  personName: string,
  role: RecordRole,
): RecordInfo {
  return {
    ...recordSummaryJson(record, personName),
    type: record.type,
    details: record.details,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    createdByName: record.createdByName,
    updatedByName: record.updatedByName,
    role,
  } as RecordInfo;
}

export function trashedRecordJson(
  record: HealthRecord,
  personName: string,
): TrashedRecordInfo {
  const deletedAt = record.deletedAt ?? new Date(0);
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    recordDate: record.recordDate,
    personName,
    deletedAt: deletedAt.toISOString(),
    deletedByName: record.deletedByName,
    purgeAt: purgeAt(deletedAt).toISOString(),
  };
}

export function recordAccountJson(
  household: {
    ownerId: string;
    ownerName: string;
    profiles: FamilyProfile[];
  },
  role: RecordRole,
): RecordAccountInfo {
  return {
    ownerId: household.ownerId,
    ownerName: household.ownerName,
    role,
    people: [
      { profileId: null, name: household.ownerName, relationship: null },
      ...household.profiles.map((p) => ({
        profileId: p.id,
        name: fullName(p),
        relationship: p.relationship,
      })),
    ],
  };
}
