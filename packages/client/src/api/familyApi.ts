import type {
  AccessLevel,
  FamilyOverview,
  FamilyProfileInfo,
  FamilyProfileInput,
  InvitationPreview,
  InviteFamilyInput,
} from "@talaan/shared";
import { request } from "./http";

export async function fetchFamily() {
  return await request<FamilyOverview>("/api/family");
}

export async function inviteFamily(input: InviteFamilyInput) {
  await request<unknown>("/api/family/invitations", "POST", input);
}

export async function resendInvitation(id: string) {
  await request<void>(
    `/api/family/invitations/${encodeURIComponent(id)}/resend`,
    "POST",
  );
}

export async function cancelInvitation(id: string) {
  await request<void>(
    `/api/family/invitations/${encodeURIComponent(id)}`,
    "DELETE",
  );
}

// The token travels in the body, not the address, so it stays out of server logs
export async function lookUpInvitation(token: string) {
  return await request<InvitationPreview>(
    "/api/family/invitations/lookup",
    "POST",
    { token },
  );
}

export async function acceptInvitation(token: string) {
  await request<void>("/api/family/invitations/accept", "POST", { token });
}

export async function declineInvitation(token: string) {
  await request<void>("/api/family/invitations/decline", "POST", { token });
}

export async function changeMemberAccess(userId: string, access: AccessLevel) {
  await request<void>(
    `/api/family/members/${encodeURIComponent(userId)}`,
    "PUT",
    { access },
  );
}

export async function removeMember(userId: string) {
  await request<void>(
    `/api/family/members/${encodeURIComponent(userId)}`,
    "DELETE",
  );
}

export async function leaveShared(ownerId: string) {
  await request<void>(
    `/api/family/shared/${encodeURIComponent(ownerId)}`,
    "DELETE",
  );
}

export async function addProfile(input: FamilyProfileInput) {
  const data = await request<{ profile: FamilyProfileInfo }>(
    "/api/family/profiles",
    "POST",
    input,
  );
  return data.profile;
}

export async function updateProfile(id: string, input: FamilyProfileInput) {
  const data = await request<{ profile: FamilyProfileInfo }>(
    `/api/family/profiles/${encodeURIComponent(id)}`,
    "PUT",
    input,
  );
  return data.profile;
}

export async function removeProfile(id: string) {
  await request<void>(
    `/api/family/profiles/${encodeURIComponent(id)}`,
    "DELETE",
  );
}
