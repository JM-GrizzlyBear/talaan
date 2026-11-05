import type { FamilyRelationship } from "@talaan/shared";

// Someone without their own email or phone, kept under the owner's account.
// Their records (next PRs) belong to the owner's account too.
export interface FamilyProfile {
  id: string;
  ownerId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  relationship: FamilyRelationship;
  // "YYYY-MM-DD", or null when not known
  birthDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FamilyProfileFields = Pick<
  FamilyProfile,
  "firstName" | "middleName" | "lastName" | "relationship" | "birthDate"
>;
