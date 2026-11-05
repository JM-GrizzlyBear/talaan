import type { AccessLevel, FamilyRelationship } from "@talaan/shared";

// Permission for member to see (or manage) owner's records. One way.
export interface FamilyAccess {
  ownerId: string;
  memberId: string;
  relationship: FamilyRelationship;
  access: AccessLevel;
  createdAt: Date;
}

// The other person in a FamilyAccess, with their name and email
export interface FamilyAccessWithPerson extends FamilyAccess {
  person: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    email: string;
  };
}
