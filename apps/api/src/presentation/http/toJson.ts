import type {
  FamilyMemberInfo,
  FamilyProfileInfo,
  PasskeyInfo,
  SentInvitationInfo,
  SharedWithMeInfo,
  PublicUser,
  TrustedBrowserInfo,
} from "@talaan/shared";
import type { FamilyAccessWithPerson } from "../../domain/family/FamilyAccess.js";
import type { FamilyInvitation } from "../../domain/family/FamilyInvitation.js";
import type { FamilyProfile } from "../../domain/family/FamilyProfile.js";
import type { Passkey } from "../../domain/passkey/Passkey.js";
import type { TrustedBrowser } from "../../domain/trustedBrowser/TrustedBrowser.js";
import type { SafeUser } from "../../domain/user/User.js";

// Domain objects → what the browser receives (dates as ISO strings, no internal fields)

export function userJson(user: SafeUser): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    email: user.email,
    lockAfterMinutes: user.lockAfterMinutes,
    twoStepEnabled: user.twoStepEnabled,
    passkeyCount: user.passkeyCount,
    createdAt: user.createdAt.toISOString(),
  };
}

// No key material: the browser only needs a name and dates
export function passkeyJson(passkey: Passkey): PasskeyInfo {
  return {
    id: passkey.id,
    name: passkey.name,
    synced: passkey.deviceType === "multiDevice",
    createdAt: passkey.createdAt.toISOString(),
    lastUsedAt: passkey.lastUsedAt?.toISOString() ?? null,
  };
}

export function browserJson(
  browser: TrustedBrowser,
  currentId: string | null,
): TrustedBrowserInfo {
  return {
    id: browser.id,
    label: browser.label,
    current: browser.id === currentId,
    createdAt: browser.createdAt.toISOString(),
    lastUsedAt: browser.lastUsedAt.toISOString(),
    expiresAt: browser.expiresAt.toISOString(),
  };
}

export function familyProfileJson(profile: FamilyProfile): FamilyProfileInfo {
  return {
    id: profile.id,
    firstName: profile.firstName,
    middleName: profile.middleName,
    lastName: profile.lastName,
    relationship: profile.relationship,
    birthDate: profile.birthDate,
    createdAt: profile.createdAt.toISOString(),
  };
}

export function familyMemberJson(
  member: FamilyAccessWithPerson,
): FamilyMemberInfo {
  return {
    userId: member.person.id,
    firstName: member.person.firstName,
    middleName: member.person.middleName,
    lastName: member.person.lastName,
    email: member.person.email,
    relationship: member.relationship,
    access: member.access,
    since: member.createdAt.toISOString(),
  };
}

// No token hash: the link only ever exists in the email
export function sentInvitationJson(
  invitation: FamilyInvitation,
  status: SentInvitationInfo["status"],
): SentInvitationInfo {
  return {
    id: invitation.id,
    email: invitation.email,
    relationship: invitation.relationship,
    access: invitation.access,
    status,
    sentAt: invitation.sentAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

export function sharedWithMeJson(
  owner: FamilyAccessWithPerson,
  profiles: FamilyProfile[],
): SharedWithMeInfo {
  return {
    ownerId: owner.person.id,
    firstName: owner.person.firstName,
    middleName: owner.person.middleName,
    lastName: owner.person.lastName,
    email: owner.person.email,
    relationship: owner.relationship,
    access: owner.access,
    since: owner.createdAt.toISOString(),
    profiles: profiles.map(familyProfileJson),
  };
}
