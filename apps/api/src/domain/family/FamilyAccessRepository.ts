import type { AccessLevel } from "@talaan/shared";
import type { FamilyAccess, FamilyAccessWithPerson } from "./FamilyAccess.js";

export interface FamilyAccessRepository {
  find(ownerId: string, memberId: string): Promise<FamilyAccess | null>;
  // Grants (or updates) access
  save(access: Omit<FamilyAccess, "createdAt">): Promise<void>;
  // People who can see this owner's records (person = the member)
  listMembers(ownerId: string): Promise<FamilyAccessWithPerson[]>;
  // People whose records this member can see (person = the owner)
  listOwners(memberId: string): Promise<FamilyAccessWithPerson[]>;
  countMembers(ownerId: string): Promise<number>;
  // Is this email already one of the owner's members?
  hasMemberWithEmail(ownerId: string, email: string): Promise<boolean>;
  updateAccess(
    ownerId: string,
    memberId: string,
    access: AccessLevel,
  ): Promise<boolean>;
  remove(ownerId: string, memberId: string): Promise<boolean>;
}
