import type {
  ChangePasswordInput,
  PasskeyInfo,
  PublicUser,
  SecuritySettingsInput,
  TrustedBrowserInfo,
} from "@talaan/shared";
import { passkeyDevice, request } from "./http";

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

export async function listPasskeys() {
  const data = await request<{ passkeys: PasskeyInfo[] }>(
    "/api/account/passkeys",
  );
  return data.passkeys;
}

// The device makes a key pair and shows its own prompt; the API keeps the public key
export async function addPasskey(name: string) {
  const options = await request<unknown>(
    "/api/account/passkeys/options",
    "POST",
  );
  const response = await passkeyDevice().create(options);
  const data = await request<{ passkey: PasskeyInfo }>(
    "/api/account/passkeys",
    "POST",
    { name, response },
  );
  return data.passkey;
}

export async function removePasskey(id: string) {
  await request<void>(
    `/api/account/passkeys/${encodeURIComponent(id)}`,
    "DELETE",
  );
}

export async function listTrustedBrowsers() {
  const data = await request<{ browsers: TrustedBrowserInfo[] }>(
    "/api/account/browsers",
  );
  return data.browsers;
}

export async function forgetBrowser(id: string) {
  await request<void>(
    `/api/account/browsers/${encodeURIComponent(id)}`,
    "DELETE",
  );
}

export async function forgetAllBrowsers() {
  await request<void>("/api/account/browsers", "DELETE");
}

export async function signOutOtherDevices() {
  await request<void>("/api/account/sign-out-others", "POST");
}
