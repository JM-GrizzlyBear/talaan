import type { LockAfterMinutes } from "@talaan/shared";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  lockAfterMinutes: LockAfterMinutes;
  privacyConsentAt: Date;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Everything the browser may see: no password hash
export type SafeUser = Pick<
  User,
  "id" | "name" | "email" | "lockAfterMinutes" | "createdAt"
>;

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    lockAfterMinutes: user.lockAfterMinutes,
    createdAt: user.createdAt,
  };
}
