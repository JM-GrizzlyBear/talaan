import type { LabGroup, LabRecordResults, LabSeries } from "@talaan/shared";

export interface LabFilters {
  search: string;
  group: LabGroup | "";
  // Only tests with a result outside the normal range
  onlyOut: boolean;
  // Only results from this many years back; 0: all
  years: number;
}

export const NO_FILTERS: LabFilters = {
  search: "",
  group: "",
  onlyOut: false,
  years: 0,
};

// "YYYY-MM-DD" of the earliest date shown, or "" for all
export function sinceDate(years: number, today: string) {
  if (!years) return "";
  return `${Number(today.slice(0, 4)) - years}${today.slice(4)}`;
}

// The tests to show, with only the results in the chosen years
export function filterSeries(
  series: LabSeries[],
  filters: LabFilters,
  today: string,
): LabSeries[] {
  const since = sinceDate(filters.years, today);
  const words = filters.search.trim().toLowerCase();
  return series
    .map((s) => ({ ...s, points: s.points.filter((p) => p.date >= since) }))
    .filter(
      (s) =>
        s.points.length > 0 &&
        (!filters.group || s.group === filters.group) &&
        (!words ||
          s.name.toLowerCase().includes(words) ||
          s.key.includes(words)) &&
        (!filters.onlyOut || s.points.some((p) => p.flag !== null)),
    );
}

// The lab records as columns, newest first, only those with a test shown
export function columnsFor(records: LabRecordResults[], series: LabSeries[]) {
  const used = new Set(series.flatMap((s) => s.points.map((p) => p.recordId)));
  return records
    .filter((r) => used.has(r.recordId))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.recordId.localeCompare(a.recordId),
    );
}
