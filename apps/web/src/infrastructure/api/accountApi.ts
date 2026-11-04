import type {
  ChangePasswordInput,
  PublicUser,
  SecuritySettingsInput,
} from "@talaan/shared";
import { request } from "./http";

export async function changePassword(input: ChangePasswordInput) {
  await request<void>("/api/account/password", "PUT", input);
}

export async function updateSecuritySettings(input: SecuritySettingsInput) {
  const data = await request<{ user: PublicUser }>(
    "/api/account/security",
    "PUT",
    input,
  );
  return data.user;
}
