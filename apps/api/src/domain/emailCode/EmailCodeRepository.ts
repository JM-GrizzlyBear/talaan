import type { EmailCode } from "./EmailCode.js";

// One table per purpose (password reset, sign-in), the same rules for both
export interface EmailCodeRepository {
  // One code per account: asking again replaces the older code
  replace(code: Omit<EmailCode, "tries">): Promise<void>;
  find(userId: string): Promise<EmailCode | null>;
  // Counts a wrong try and returns how many tries have been used
  addTry(userId: string): Promise<number>;
  remove(userId: string): Promise<void>;
}
