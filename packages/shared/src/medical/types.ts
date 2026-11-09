import type { RecordRole } from "../records/types.js";
import type { EmergencyExtra, MedicalIdFields } from "./schema.js";

export interface MedicalIdInfo {
  ownerId: string;
  // null: the account owner
  profileId: string | null;
  personName: string;
  role: RecordRole;
  fields: MedicalIdFields;
  // null: never saved yet
  updatedAt: string | null;
  updatedByName: string | null;
  // The last time someone said it's still right (or saved it)
  checkedAt: string | null;
  emergency: {
    on: boolean;
    extras: EmergencyExtra[];
    // The emergency page's code (only for those who can change the ID)
    token: string | null;
  };
}

// What the emergency QR shows to anyone who scans it, without signing in
export interface EmergencyInfo {
  // First name and the last name's first letter: "Maria S."
  name: string;
  contacts: MedicalIdFields["contacts"];
  bloodType?: MedicalIdFields["bloodType"];
  allergies?: MedicalIdFields["allergies"];
  noKnownAllergies?: boolean;
  conditions?: MedicalIdFields["conditions"];
  medicines?: MedicalIdFields["medicines"];
}
