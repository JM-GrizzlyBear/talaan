import type { RecordFileInfo } from "../files.js";
import type { LabRecordResults } from "../labs/index.js";
import type { MedicalIdFields } from "../medical/index.js";
import type { RecordType } from "../records/constants.js";
import type { RecordInfo } from "../records/types.js";
import type { ShareStatus } from "./constants.js";

export interface ShareViewInfo {
  openedAt: string;
  // "Chrome on Android"
  device: string;
}

// A link, as the family sees it
export interface ShareLinkInfo {
  id: string;
  ownerId: string;
  profileId: string | null;
  personName: string;
  recipient: string;
  note: string;
  // For the link and QR (/s/<token>)
  token: string;
  medicalId: boolean;
  labs: boolean;
  records: {
    id: string;
    title: string;
    type: RecordType;
    recordDate: string;
  }[];
  hasPin: boolean;
  expiresAt: string;
  maxViews: number | null;
  status: ShareStatus;
  views: ShareViewInfo[];
  createdByName: string | null;
  createdAt: string;
  stoppedAt: string | null;
  stoppedByName: string | null;
}

// One record on the doctor's page, with its photos and PDFs
export type SharedRecordInfo = RecordInfo & { files: RecordFileInfo[] };

// The doctor's page, before the PIN: nothing about the person yet
export interface SharedGate {
  needsPin: boolean;
  // Wrong PINs: wait until this time
  waitUntil: string | null;
}

// The doctor's page, once opened
export interface SharedPageInfo {
  recipient: string;
  sharedByName: string | null;
  personName: string;
  note: string;
  expiresAt: string;
  // Opened by someone in the family (not counted, no alert)
  preview: boolean;
  medicalId: MedicalIdFields | null;
  labs: LabRecordResults[] | null;
  records: SharedRecordInfo[];
}
