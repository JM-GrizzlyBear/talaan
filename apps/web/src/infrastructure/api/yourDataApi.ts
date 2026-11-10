import type { DeleteAccountInput } from "@talaan/shared";
import { request } from "./http";

// A link, so the browser downloads the ZIP straight to disk as it comes
export const EXPORT_URL = "/api/account/export";

export async function deleteAccount(input: DeleteAccountInput) {
  return await request<{ deleted: boolean; deleteAfter?: string }>(
    "/api/account/delete",
    "POST",
    input,
  );
}
