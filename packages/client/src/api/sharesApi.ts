import type {
  FileVariant,
  NewShare,
  SharedGate,
  SharedPageInfo,
  ShareLinkInfo,
  ShareSettings,
} from "@talaan/shared";
import { request, webUrl } from "./http";

export type NewShareInput = Omit<NewShare, "note" | "maxViews" | "pin"> &
  Partial<Pick<NewShare, "note" | "maxViews" | "pin">>;

export async function fetchShares(ownerId: string) {
  const query = new URLSearchParams({ ownerId });
  return (await request<{ links: ShareLinkInfo[] }>(`/api/shares?${query}`))
    .links;
}

export async function fetchShare(id: string) {
  return (
    await request<{ link: ShareLinkInfo }>(
      `/api/shares/${encodeURIComponent(id)}`,
    )
  ).link;
}

export async function createShare(input: NewShareInput) {
  return (await request<{ link: ShareLinkInfo }>("/api/shares", "POST", input))
    .link;
}

export async function updateShare(id: string, settings: ShareSettings) {
  return (
    await request<{ link: ShareLinkInfo }>(
      `/api/shares/${encodeURIComponent(id)}/settings`,
      "PUT",
      settings,
    )
  ).link;
}

export async function stopShare(id: string) {
  return (
    await request<{ link: ShareLinkInfo }>(
      `/api/shares/${encodeURIComponent(id)}/stop`,
      "POST",
    )
  ).link;
}

export async function removeShare(id: string) {
  await request<void>(`/api/shares/${encodeURIComponent(id)}`, "DELETE");
}

// The doctor's side (no sign-in)

const shared = (token: string) => `/api/shared/${encodeURIComponent(token)}`;

export async function fetchShared(token: string) {
  return await request<{ page?: SharedPageInfo; gate?: SharedGate }>(
    shared(token),
  );
}

export async function openShared(token: string, pin: string) {
  return (
    await request<{ page: SharedPageInfo }>(`${shared(token)}/open`, "POST", {
      pin,
    })
  ).page;
}

export function sharedFileUrl(
  token: string,
  fileId: string,
  variant: FileVariant,
  download = false,
) {
  const query = new URLSearchParams({ variant });
  if (download) query.set("download", "1");
  return `${shared(token)}/files/${encodeURIComponent(fileId)}/content?${query}`;
}

// The address to give the doctor
export const shareUrl = (token: string) => `${webUrl()}/s/${token}`;
