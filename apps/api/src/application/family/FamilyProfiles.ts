import {
  FAMILY_LIMITS,
  fullName,
  relationshipLabel,
  type AuditChange,
  type FamilyRelationship,
} from "@talaan/shared";
import { NotFoundError } from "../../domain/errors.js";
import type { FamilyProfileFields } from "../../domain/family/FamilyProfile.js";
import type { FamilyProfileRepository } from "../../domain/family/FamilyProfileRepository.js";
import { FamilyError } from "../../domain/family/errors.js";
import type { RecordRepository } from "../../domain/record/RecordRepository.js";
import type { AuditTrail } from "../audit/AuditTrail.js";

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
function profileChanges(
  before: FamilyProfileFields,
  after: FamilyProfileFields,
): AuditChange[] {
  const pairs: [string, string | null, string | null][] = [
    ["Name", fullName(before), fullName(after)],
    [
      "Who they are",
      relationshipLabel(before.relationship),
      relationshipLabel(after.relationship),
    ],
    ["Birthday", before.birthDate, after.birthDate],
  ];
  return pairs
    .filter(([, from, to]) => from !== to)
    .map(([field, from, to]) => ({ field, from, to }));
}

export class FamilyProfiles {
  constructor(
    private readonly profiles: FamilyProfileRepository,
    private readonly records: RecordRepository,
    private readonly audit: AuditTrail,
  ) {}

  private async findOwn(ownerId: string, id: string) {
    const [profile] = (await this.profiles.listForOwners([ownerId])).filter(
      (p) => p.id === id,
    );
    if (!profile) throw new NotFoundError(GONE);
    return profile;
  }

  async add(ownerId: string, input: FamilyProfileInputFields) {
    if (
      (await this.profiles.countForOwner(ownerId)) >= FAMILY_LIMITS.profiles
    ) {
      throw FamilyError.tooManyProfiles(FAMILY_LIMITS.profiles);
    }
    const profile = await this.profiles.create(ownerId, toFields(input));
    await this.audit.log({
      ownerId,
      action: "profile.added",
      actorId: ownerId,
      subject: fullName(profile),
    });
    return profile;
  }

  async update(ownerId: string, id: string, input: FamilyProfileInputFields) {
    const before = await this.findOwn(ownerId, id);
    const profile = await this.profiles.update(id, ownerId, toFields(input));
    if (!profile) throw new NotFoundError(GONE);
    const changes = profileChanges(before, profile);
    if (changes.length > 0) {
      await this.audit.log({
        ownerId,
        action: "profile.edited",
        actorId: ownerId,
        subject: fullName(profile),
        changes,
      });
    }
    return profile;
  }

  // A profile with records (even in the Trash) stays, so no record loses its person
  async remove(ownerId: string, id: string) {
    const profile = await this.findOwn(ownerId, id);
    const count = await this.records.countForProfile(id);
    if (count > 0)
      throw FamilyError.profileHasRecords(profile.firstName, count);
    if (!(await this.profiles.remove(id, ownerId))) {
      throw new NotFoundError(GONE);
    }
    await this.audit.log({
      ownerId,
      action: "profile.removed",
      actorId: ownerId,
      subject: fullName(profile),
    });
  }
}
