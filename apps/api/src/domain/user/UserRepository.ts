import type { LockAfterMinutes } from "@talaan/shared";
import type { User } from "./User.js";

export interface NewUser {
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  passwordHash: string;
  privacyConsentAt: Date;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: NewUser): Promise<User>;
  updatePassword(
    id: string,
    passwordHash: string,
    changedAt: Date,
  ): Promise<void>;
  updateSecurity(
    id: string,
    settings: { lockAfterMinutes?: LockAfterMinutes; twoStepEnabled?: boolean },
  ): Promise<User>;
}
