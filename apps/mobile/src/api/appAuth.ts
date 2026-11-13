import { request } from "@talaan/client";
import type { PublicUser } from "@talaan/shared";

// The two calls only the app makes: a key for Face ID / fingerprint
// unlocking (kept in the phone's secure storage), and unlocking with it
export async function makeDeviceKey() {
  return await request<{ deviceKey: string }>("/api/auth/device-key", "POST");
}

export async function unlockWithDeviceKey(deviceKey: string) {
  const data = await request<{ user: PublicUser }>(
    "/api/auth/unlock/device",
    "POST",
    { deviceKey },
  );
  return data.user;
}
