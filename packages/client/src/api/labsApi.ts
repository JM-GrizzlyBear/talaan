import type { LabRecordResults, RecordRole } from "@talaan/shared";
import { request } from "./http";

export interface LabsInfo {
  role: RecordRole;
  personName: string;
  records: LabRecordResults[];
}

// One person's lab results across all their lab records. profileId "self":
// the account owner.
export async function fetchLabs(ownerId: string, profileId: string) {
  const query = new URLSearchParams({ ownerId, profileId });
  return await request<LabsInfo>(`/api/labs?${query}`);
}
