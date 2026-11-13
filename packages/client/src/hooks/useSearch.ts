import { SEARCH_LIMITS } from "@talaan/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchSearch } from "../api/searchApi";

// Results for what was typed (kept on screen while the next ones load)
export function useSearch(q: string) {
  const text = q.trim();
  return useQuery({
    queryKey: ["search", text],
    queryFn: async () => await fetchSearch(text),
    enabled: text.length >= SEARCH_LIMITS.minLength,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
