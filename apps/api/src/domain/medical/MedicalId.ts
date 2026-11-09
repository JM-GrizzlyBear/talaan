import type { EmergencyExtra, MedicalIdFields } from "@talaan/shared";

export interface MedicalId {
  ownerId: string;
  profileId: string | null;
  fields: MedicalIdFields;
  checkedAt: Date;
  emergencyOn: boolean;
  emergencyToken: string | null;
  emergencyExtras: EmergencyExtra[];
  updatedByName: string | null;
  updatedAt: Date;
}

export interface MedicalIdRepository {
  find(ownerId: string, profileId: string | null): Promise<MedicalId | null>;
  // Creates it the first time
  save(
    ownerId: string,
    profileId: string | null,
    fields: MedicalIdFields,
    actorId: string,
    at: Date,
  ): Promise<void>;
  markChecked(
    ownerId: string,
    profileId: string | null,
    at: Date,
  ): Promise<void>;
  setEmergency(
    ownerId: string,
    profileId: string | null,
    emergency: { on: boolean; token: string | null; extras: EmergencyExtra[] },
    actorId: string,
    at: Date,
  ): Promise<void>;
  // The emergency page: the ID and the person's names (only when it's on)
  findByEmergencyToken(token: string): Promise<{
    medicalId: MedicalId;
    firstName: string;
    middleName: string | null;
    lastName: string;
  } | null>;
}
