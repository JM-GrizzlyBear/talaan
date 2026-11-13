import type { Appearance, PublicUser } from "@talaan/shared";
import { request } from "./http";

export async function saveAppearance(appearance: Appearance) {
  return (
    await request<{ user: PublicUser }>(
      "/api/account/appearance",
      "PUT",
      appearance,
    )
  ).user;
}
