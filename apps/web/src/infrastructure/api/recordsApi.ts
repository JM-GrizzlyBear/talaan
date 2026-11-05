import type {
  AuditEntryInfo,
  RecordAccountInfo,
  RecordFieldsInput,
  RecordInfo,
  RecordRole,
  RecordSummary,
  RecordType,
  TrashedRecordInfo,
} from "@talaan/shared";
import { request } from "./http";

export interface RecordFilters {
  ownerId?: string;
  // "self" or a profile id
  profileId?: string;
  type?: RecordType;
}

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function fetchAccounts() {
  const data = await request<{ accounts: RecordAccountInfo[] }>(
    "/api/records/accounts",
  );
  return data.accounts;
}

export async function fetchRecords(filters: RecordFilters) {
  return await request<{ role: RecordRole; records: RecordSummary[] }>(
    `/api/records${query({ ...filters })}`,
  );
}

export async function fetchRecord(id: string) {
  const data = await request<{ record: RecordInfo }>(
    `/api/records/${encodeURIComponent(id)}`,
  );
  return data.record;
}

export async function createRecord(ownerId: string, fields: RecordFieldsInput) {
  const data = await request<{ record: RecordInfo }>("/api/records", "POST", {
    ownerId,
    ...fields,
  });
  return data.record;
}

export async function updateRecord(id: string, fields: RecordFieldsInput) {
  const data = await request<{ record: RecordInfo }>(
    `/api/records/${encodeURIComponent(id)}`,
    "PUT",
    fields,
  );
  return data.record;
}

export async function moveRecordToTrash(id: string) {
  await request<void>(`/api/records/${encodeURIComponent(id)}`, "DELETE");
}

export async function fetchTrash() {
  const data = await request<{ records: TrashedRecordInfo[] }>(
    "/api/records/trash",
  );
  return data.records;
}

export async function restoreRecord(id: string) {
  await request<void>(`/api/records/${encodeURIComponent(id)}/restore`, "POST");
}

export async function deleteRecordForever(id: string) {
  await request<void>(
    `/api/records/${encodeURIComponent(id)}/forever`,
    "DELETE",
  );
}

export async function emptyTrash() {
  return await request<{ deleted: number }>("/api/records/trash", "DELETE");
}

export async function fetchRecordHistory(id: string) {
  const data = await request<{ entries: AuditEntryInfo[] }>(
    `/api/records/${encodeURIComponent(id)}/history`,
  );
  return data.entries;
}

export async function fetchActivity(before?: string) {
  return await request<{ entries: AuditEntryInfo[]; next: string | null }>(
    `/api/activity${query({ before })}`,
  );
}
