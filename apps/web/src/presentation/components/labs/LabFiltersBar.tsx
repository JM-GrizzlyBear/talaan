import { LAB_GROUPS, type LabGroup } from "@talaan/shared";
import { CheckboxField } from "../ui/CheckboxField";
import { SelectField } from "../ui/SelectField";
import { TextField } from "../ui/TextField";
import type { LabFilters } from "@talaan/client";

// Search, group, years, and only results out of range
export function LabFiltersBar({
  filters,
  onChange,
}: {
  filters: LabFilters;
  onChange: (filters: LabFilters) => void;
}) {
  const set = <K extends keyof LabFilters>(key: K, value: LabFilters[K]) =>
    onChange({ ...filters, [key]: value });
  return (
    <div className="grid gap-3 rounded-xl border border-edge bg-white p-4 sm:grid-cols-3">
      <TextField
        label="Find a test"
        value={filters.search}
        onChange={(v) => set("search", v)}
        placeholder="Hemoglobin, FBS, SGPT…"
      />
      <SelectField
        label="Group"
        value={filters.group}
        onChange={(v) => set("group", v as LabGroup | "")}
        options={[
          { value: "", label: "All groups" },
          ...LAB_GROUPS.map((g) => ({ value: g, label: g })),
        ]}
      />
      <SelectField
        label="Results from"
        value={String(filters.years)}
        onChange={(v) => set("years", Number(v))}
        options={[
          { value: "0", label: "All years" },
          { value: "1", label: "The last year" },
          { value: "2", label: "The last 2 years" },
          { value: "5", label: "The last 5 years" },
        ]}
      />
      <div className="sm:col-span-3">
        <CheckboxField
          checked={filters.onlyOut}
          onChange={(on) => set("onlyOut", on)}
        >
          Only tests with a result outside the normal range
        </CheckboxField>
      </div>
    </div>
  );
}
