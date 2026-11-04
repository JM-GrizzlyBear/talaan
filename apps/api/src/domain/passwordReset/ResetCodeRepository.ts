import type { ResetCode } from "./ResetCode.js";

export interface ResetCodeRepository {
  // One code per account: asking again replaces the older code
  replace(code: Omit<ResetCode, "tries">): Promise<void>;
  find(userId: string): Promise<ResetCode | null>;
  // Counts a wrong try and returns how many tries have been used
  addTry(userId: string): Promise<number>;
  remove(userId: string): Promise<void>;
}
