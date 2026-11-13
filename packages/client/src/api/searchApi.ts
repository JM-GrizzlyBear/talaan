import type { SearchResponse } from "@talaan/shared";
import { request } from "./http";

export async function fetchSearch(q: string) {
  return await request<SearchResponse>(
    `/api/search?${new URLSearchParams({ q })}`,
  );
}
