import type {
  Appearance,
  LoginResult,
  MedicalIdInfo,
  PublicUser,
  RecordAccountInfo,
  RecordFileInfo,
  RecordInfo,
  RecordRole,
  RecordSummary,
  SessionInfo,
  SignedIn,
} from "@talaan/shared";
import type { Client } from "./client";

const q = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) s.set(k, v);
  const text = s.toString();
  return text ? `?${text}` : "";
};

// Every call the app makes, in one place
export function endpoints(client: Client) {
  const { request } = client;
  return {
    me: () => request<SessionInfo>("/api/auth/me"),
    logIn: (email: string, password: string) =>
      request<LoginResult>("/api/auth/login", "POST", { email, password }),
    submitCode: (code: string) =>
      request<SignedIn>("/api/auth/login/code", "POST", {
        code,
        rememberBrowser: false,
      }),
    resendCode: () => request<void>("/api/auth/login/resend", "POST"),
    logOut: () => request<void>("/api/auth/logout", "POST"),
    makeDeviceKey: () =>
      request<{ deviceKey: string }>("/api/auth/device-key", "POST"),
    unlockWithDeviceKey: (deviceKey: string) =>
      request<{ user: PublicUser }>("/api/auth/unlock/device", "POST", {
        deviceKey,
      }),
    unlockWithPassword: (password: string) =>
      request<{ user: PublicUser }>("/api/auth/unlock", "POST", { password }),
    saveAppearance: (appearance: Appearance) =>
      request<{ user: PublicUser }>(
        "/api/account/appearance",
        "PUT",
        appearance,
      ),

    accounts: async () =>
      (
        await request<{ accounts: RecordAccountInfo[] }>(
          "/api/records/accounts",
        )
      ).accounts,
    records: (ownerId: string, profileId?: string) =>
      request<{ role: RecordRole; records: RecordSummary[] }>(
        `/api/records${q({ ownerId, profileId })}`,
      ),
    record: async (id: string) =>
      (
        await request<{ record: RecordInfo }>(
          `/api/records/${encodeURIComponent(id)}`,
        )
      ).record,
    recordFiles: async (id: string) =>
      (
        await request<{ files: RecordFileInfo[] }>(
          `/api/records/${encodeURIComponent(id)}/files`,
        )
      ).files,
    medicalId: async (ownerId: string, profileId: string) =>
      (
        await request<{ medicalId: MedicalIdInfo }>(
          `/api/medical-id${q({ ownerId, profileId })}`,
        )
      ).medicalId,
    fileSource: (id: string, variant: "thumb" | "preview" | "original") =>
      client.fileSource(
        `/api/files/${encodeURIComponent(id)}/content?variant=${variant}`,
      ),
  };
}

export type Endpoints = ReturnType<typeof endpoints>;
