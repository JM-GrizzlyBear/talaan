// An account waiting to be deleted (suspended)
export interface Suspension {
  userId: string;
  email: string;
  firstName: string;
  suspendedAt: Date;
  deleteAfter: Date;
  remindedAt: Date | null;
  warnedAt: Date | null;
}

// Suspending, bringing back and deleting whole accounts
export interface AccountRepository {
  suspend(userId: string, at: Date, deleteAfter: Date): Promise<void>;
  // false when it wasn't suspended
  reactivate(userId: string): Promise<boolean>;
  findSuspension(userId: string): Promise<Suspension | null>;
  // Every suspended account whose deletion date is before this
  listSuspended(): Promise<Suspension[]>;
  markReminded(userId: string, at: Date): Promise<void>;
  markWarned(userId: string, at: Date): Promise<void>;
  // Every photo and PDF the account keeps in storage (records, in the Trash
  // too, and places)
  storageKeys(ownerId: string): Promise<string[]>;
  // The account and everything in it (the database removes the rest)
  remove(userId: string): Promise<void>;
}
