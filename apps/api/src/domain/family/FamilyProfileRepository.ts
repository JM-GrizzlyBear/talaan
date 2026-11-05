import type { FamilyProfile, FamilyProfileFields } from "./FamilyProfile.js";

export interface FamilyProfileRepository {
  listForOwners(ownerIds: string[]): Promise<FamilyProfile[]>;
  countForOwner(ownerId: string): Promise<number>;
  create(ownerId: string, fields: FamilyProfileFields): Promise<FamilyProfile>;
  // null when there's no such profile under this owner
  update(
    id: string,
    ownerId: string,
    fields: FamilyProfileFields,
  ): Promise<FamilyProfile | null>;
  remove(id: string, ownerId: string): Promise<boolean>;
}
