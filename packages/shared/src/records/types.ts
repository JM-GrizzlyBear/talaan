import type { AccessLevel, FamilyRelationship } from "../family/index.js";
import type { RecordType } from "./constants.js";
import type { RecordFields } from "./schemas.js";

// "owner": your own account. "manage"/"view": shared with you.
export type RecordRole = "owner" | AccessLevel;

export interface RecordPersonInfo {
  // null: the account owner themself
  profileId: string | null;
  name: string;
  relationship: FamilyRelationship | null;
}

// An account whose records you can open, and the people in it
export interface RecordAccountInfo {
  ownerId: string;
  ownerName: string;
  role: RecordRole;
  people: RecordPersonInfo[];
}

export interface RecordSummary {
  id: string;
  ownerId: string;
  profileId: string | null;
  personName: string;
  type: RecordType;
  title: string;
  recordDate: string;
  facility: string;
  doctor: string;
  // Lab results outside the normal range
  outOfRange: number;
  // Photos and PDFs attached
  fileCount: number;
  updatedAt: string;
}

export type RecordInfo = RecordSummary &
  RecordFields & {
    createdAt: string;
    createdByName: string | null;
    updatedByName: string | null;
    // What the person looking can do with it
    role: RecordRole;
  };

export interface TrashedRecordInfo {
  id: string;
  type: RecordType;
  title: string;
  recordDate: string;
  personName: string;
  deletedAt: string;
  deletedByName: string | null;
  // When it's deleted for good
  purgeAt: string;
}
