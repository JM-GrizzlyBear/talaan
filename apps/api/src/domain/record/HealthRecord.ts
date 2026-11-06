import type { RecordFields } from "@talaan/shared";

// A health record (named HealthRecord so it doesn't clash with TypeScript's Record)
export type HealthRecord = RecordFields & {
  id: string;
  // The account it belongs to
  ownerId: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedBy: string | null;
  updatedByName: string | null;
  updatedAt: Date;
  // Set while it's in the Trash
  deletedAt: Date | null;
  deletedBy: string | null;
  deletedByName: string | null;
  // Photos and PDFs attached
  fileCount: number;
};
