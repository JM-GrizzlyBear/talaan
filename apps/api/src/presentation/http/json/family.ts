import type {
  FamilyMemberInfo,
  FamilyProfileInfo,
  SentInvitationInfo,
  SharedWithMeInfo,
} from "@talaan/shared";
import type { FamilyAccessWithPerson } from "../../../domain/family/FamilyAccess.js";
import type { FamilyInvitation } from "../../../domain/family/FamilyInvitation.js";
import type { FamilyProfile } from "../../../domain/family/FamilyProfile.js";

// Domain objects → what the browser receives (dates as ISO strings, no internal fields)

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
