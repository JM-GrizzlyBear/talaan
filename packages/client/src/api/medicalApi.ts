import type {
  EmergencyInfo,
  EmergencySettings,
  MedicalIdInfo,
  MedicalIdInput,
} from "@talaan/shared";
import { request } from "./http";

export interface Person {
  ownerId: string;
  // "self": the account owner
  profileId: string;
}

export async function fetchMedicalId(person: Person) {
  const query = new URLSearchParams({ ...person });
  return (
    await request<{ medicalId: MedicalIdInfo }>(`/api/medical-id?${query}`)
  ).medicalId;
}

export async function saveMedicalId(person: Person, fields: MedicalIdInput) {
  return (
    await request<{ medicalId: MedicalIdInfo }>("/api/medical-id", "PUT", {
      ...person,
      fields,
    })
  ).medicalId;
}

export async function markMedicalIdChecked(person: Person) {
  await request<void>("/api/medical-id/checked", "POST", person);
}

export async function saveEmergency(
  person: Person,
  settings: EmergencySettings & { newCode?: boolean },
) {
  return (
    await request<{ medicalId: MedicalIdInfo }>(
      "/api/medical-id/emergency",
      "PUT",
      { ...person, ...settings },
    )
  ).medicalId;
}

// No sign-in needed: what the emergency QR opens
export async function fetchEmergency(token: string) {
  return (
    await request<{ emergency: EmergencyInfo }>(
      `/api/emergency/${encodeURIComponent(token)}`,
    )
  ).emergency;
}
