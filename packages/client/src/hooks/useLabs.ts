import { buildLabSeries } from "@talaan/shared";
import { useQuery } from "@tanstack/react-query";
import { fetchLabs } from "../api/labsApi";

// A person's lab results, lined up by test (names matched, units converted)
export function useLabs(ownerId: string | undefined, profileId: string) {
  return useQuery({
    queryKey: ["records", "labs", ownerId, profileId],
    queryFn: async () => {
      const data = await fetchLabs(ownerId ?? "", profileId);
      return { ...data, series: buildLabSeries(data.records) };
    },
    enabled: Boolean(ownerId),
  });
}
