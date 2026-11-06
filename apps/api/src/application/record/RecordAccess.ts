import { fullName, type RecordRole } from "@talaan/shared";
import { ForbiddenError, NotFoundError } from "../../domain/errors.js";
import type { FamilyProfile } from "../../domain/family/FamilyProfile.js";
import type { FamilyProfileRepository } from "../../domain/family/FamilyProfileRepository.js";
import { canManage, canView } from "../../domain/family/rules.js";
import type { RecordRepository } from "../../domain/record/RecordRepository.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import type { FamilyMembers } from "../family/FamilyMembers.js";

export const NOT_FOUND =
  "That record isn't there anymore, or it isn't shared with you.";
const VIEW_ONLY =
  "You can view these records, but not change them. Ask the owner for “Can manage”.";
const OWNER_ONLY = "Only the owner of these records can do that.";

// The people in one account: the owner and their family profiles
export interface Household {
  ownerId: string;
  ownerName: string;
  profiles: FamilyProfile[];
}

export function personName(household: Household, profileId: string | null) {
  if (profileId === null) return household.ownerName;
  const profile = household.profiles.find((p) => p.id === profileId);
  return profile ? fullName(profile) : "Someone removed";
}

// Who may do what with an account's records, from family sharing
// (FamilyMembers.roleFor). Shared by records, the Trash and files.
// Anyone a record isn't shared with gets "not found", so they don't learn it exists.
export class RecordAccess {
  constructor(
    private readonly records: RecordRepository,
    private readonly profiles: FamilyProfileRepository,
    private readonly users: UserRepository,
    private readonly members: FamilyMembers,
  ) {}

  async household(ownerId: string): Promise<Household> {
    const owner = await this.users.findById(ownerId);
    if (!owner) throw new NotFoundError(NOT_FOUND);
    return {
      ownerId,
      ownerName: fullName(owner),
      profiles: await this.profiles.listForOwners([ownerId]),
    };
  }

  // Throws NotFound when the viewer can't see this account at all
  async roleFor(viewerId: string, ownerId: string) {
    const role = await this.members.roleFor(viewerId, ownerId);
    if (!canView(role)) throw new NotFoundError(NOT_FOUND);
    return role as RecordRole;
  }

  async requireManage(viewerId: string, ownerId: string) {
    const role = await this.roleFor(viewerId, ownerId);
    if (!canManage(role)) throw new ForbiddenError(VIEW_ONLY);
    return role;
  }

  async requireOwner(viewerId: string, ownerId: string) {
    const role = await this.roleFor(viewerId, ownerId);
    if (role !== "owner") throw new ForbiddenError(OWNER_ONLY);
  }

  // A record outside the Trash that the viewer can see
  async findVisible(viewerId: string, id: string) {
    const record = await this.records.findById(id);
    if (!record || record.deletedAt) throw new NotFoundError(NOT_FOUND);
    const role = await this.roleFor(viewerId, record.ownerId);
    return { record, role };
  }

  // Any record, including one in the Trash (reachable only by its owner),
  // and whether this person may change it
  async accessTo(viewerId: string, id: string) {
    const record = await this.records.findById(id);
    if (!record) throw new NotFoundError(NOT_FOUND);
    const role = await this.roleFor(viewerId, record.ownerId);
    if (record.deletedAt && role !== "owner") {
      throw new NotFoundError(NOT_FOUND);
    }
    return {
      record,
      role,
      canChange: canManage(role) && !record.deletedAt,
    };
  }

  requireOwnProfile(household: Household, profileId: string | null) {
    if (
      profileId !== null &&
      !household.profiles.some((p) => p.id === profileId)
    ) {
      throw new NotFoundError("That person isn't in these records anymore.");
    }
  }
}
