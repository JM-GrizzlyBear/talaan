import { FAMILY_LIMITS, type FamilyRelationship } from "@talaan/shared";
import { NotFoundError } from "../../domain/errors.js";
import type { FamilyProfileFields } from "../../domain/family/FamilyProfile.js";
import type { FamilyProfileRepository } from "../../domain/family/FamilyProfileRepository.js";
import { FamilyError } from "../../domain/family/errors.js";

export interface FamilyProfileInputFields {
  firstName: string;
  middleName: string;
  lastName: string;
  relationship: FamilyRelationship;
  birthDate: string;
}

function toFields(input: FamilyProfileInputFields): FamilyProfileFields {
  return {
    firstName: input.firstName.trim(),
    middleName: input.middleName.trim() || null,
    lastName: input.lastName.trim(),
    relationship: input.relationship,
    birthDate: input.birthDate.trim() || null,
  };
}

const GONE = "That profile isn't on your list anymore.";

// Profiles for family without their own email or phone. Only the account
// owner adds, changes or removes them.
export class FamilyProfiles {
  constructor(private readonly profiles: FamilyProfileRepository) {}

  async add(ownerId: string, input: FamilyProfileInputFields) {
    if (
      (await this.profiles.countForOwner(ownerId)) >= FAMILY_LIMITS.profiles
    ) {
      throw FamilyError.tooManyProfiles(FAMILY_LIMITS.profiles);
    }
    return await this.profiles.create(ownerId, toFields(input));
  }

  async update(ownerId: string, id: string, input: FamilyProfileInputFields) {
    const profile = await this.profiles.update(id, ownerId, toFields(input));
    if (!profile) throw new NotFoundError(GONE);
    return profile;
  }

  async remove(ownerId: string, id: string) {
    if (!(await this.profiles.remove(id, ownerId))) {
      throw new NotFoundError(GONE);
    }
  }
}
