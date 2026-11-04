import type { LockAfterMinutes } from "@talaan/shared";
import type { User } from "./User.js";

export interface NewUser {
  name: string;
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
  updateLockAfter(id: string, minutes: LockAfterMinutes): Promise<User>;
}
