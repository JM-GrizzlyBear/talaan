import type { LockAfterMinutes } from "@talaan/shared";

export interface User {
  id: string;
  firstName: string;
  // null when the person has no middle name
  middleName: string | null;
  lastName: string;
  email: string;
  passwordHash: string;
  lockAfterMinutes: LockAfterMinutes;
  // Asks for an emailed code when signing in on a browser that isn't remembered
  twoStepEnabled: boolean;
  // How many passkeys the person has added
  passkeyCount: number;
  privacyConsentAt: Date;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Everything the browser may see: no password hash
export type SafeUser = Pick<
  User,
  | "id"
  | "firstName"
  | "middleName"
  | "lastName"
  | "email"
  | "lockAfterMinutes"
  | "twoStepEnabled"
  | "passkeyCount"
  | "createdAt"
>;

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    email: user.email,
    lockAfterMinutes: user.lockAfterMinutes,
    twoStepEnabled: user.twoStepEnabled,
    passkeyCount: user.passkeyCount,
    createdAt: user.createdAt,
  };
}
