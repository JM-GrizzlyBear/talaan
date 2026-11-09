import { LAB_GROUPS, type LabGroup } from "@talaan/shared";
import { type LabFilters, NO_FILTERS } from "./labFilters";

// The filters in the address, so the print page gets the same ones
export function filtersFromParams(params: URLSearchParams): LabFilters {
  const group = params.get("group") ?? "";
  return {
    search: params.get("q") ?? "",
    group: (LAB_GROUPS as readonly string[]).includes(group)
      ? (group as LabGroup)
      : "",
    onlyOut: params.get("out") === "1",
    years: [1, 2, 5].includes(Number(params.get("years")))
      ? Number(params.get("years"))
      : 0,
  };
}

export function filtersToParams(filters: LabFilters) {
  const params: Record<string, string> = {};
  if (filters.search) params.q = filters.search;
  if (filters.group) params.group = filters.group;
  if (filters.onlyOut) params.out = "1";
  if (filters.years) params.years = String(filters.years);
  return params;
}

export const isFiltered = (f: LabFilters) =>
  JSON.stringify(f) !== JSON.stringify(NO_FILTERS);
