import type {
  ShareLinkInfo,
  SharedPageInfo,
  ShareStatus,
} from "@talaan/shared";
import type { RecordFile } from "../../../domain/file/RecordFile.js";
import type { HealthRecord } from "../../../domain/record/HealthRecord.js";
import type { ShareLink } from "../../../domain/share/ShareLink.js";
import type { LabRecordResults, MedicalIdFields } from "@talaan/shared";
import { recordFileJson } from "./files.js";
import { recordJson } from "./records.js";

// Domain objects → what the browser receives (dates as ISO strings, no PIN)

export function shareLinkJson(shown: {
  link: ShareLink;
  personName: string;
  records: HealthRecord[];
  status: ShareStatus;
}): ShareLinkInfo {
  const { link } = shown;
  return {
    id: link.id,
    ownerId: link.ownerId,
    profileId: link.profileId,
    personName: shown.personName,
    recipient: link.recipient,
    note: link.note,
    token: link.token,
    medicalId: link.medicalId,
    labs: link.labs,
    records: shown.records.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      recordDate: r.recordDate,
    })),
    hasPin: link.pinHash !== null,
    expiresAt: link.expiresAt.toISOString(),
    maxViews: link.maxViews,
    status: shown.status,
    views: link.views.map((v) => ({
      openedAt: v.openedAt.toISOString(),
      device: v.device,
    })),
    createdByName: link.createdByName,
    createdAt: link.createdAt.toISOString(),
    stoppedAt: link.stoppedAt?.toISOString() ?? null,
    stoppedByName: link.stoppedByName,
  };
}

// The doctor's page: only what was chosen. Who in the family added or
// changed each record stays out.
export function sharedPageJson(page: {
  link: ShareLink;
  personName: string;
  preview: boolean;
  medicalId: MedicalIdFields | null;
  labs: LabRecordResults[] | null;
  records: { record: HealthRecord; files: RecordFile[] }[];
}): SharedPageInfo {
  return {
    recipient: page.link.recipient,
    sharedByName: page.link.createdByName,
    personName: page.personName,
    note: page.link.note,
    expiresAt: page.link.expiresAt.toISOString(),
    preview: page.preview,
    medicalId: page.medicalId,
    labs: page.labs,
    records: page.records.map(({ record, files }) => ({
      ...recordJson({
        record,
        personName: page.personName,
        role: "view",
        place: null,
      }),
      createdByName: null,
      updatedByName: null,
      files: files.map(recordFileJson),
    })),
  };
}
