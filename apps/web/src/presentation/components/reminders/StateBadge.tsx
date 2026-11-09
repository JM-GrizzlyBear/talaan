import type { OccurrenceState } from "@talaan/shared";

const LOOKS: Record<OccurrenceState | "missed", [string, string]> = {
  done: ["Done", "bg-brand-soft text-deep"],
  skipped: ["Skipped", "bg-gray-100 text-muted"],
  snoozed: ["Snoozed", "bg-warn-soft text-warn"],
  missed: ["Missed", "bg-danger-soft text-danger"],
};

export function StateBadge({
  state,
}: {
  state: OccurrenceState | "missed" | null;
}) {
  if (!state) return null;
  const [label, look] = LOOKS[state];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${look}`}>
      {label}
    </span>
  );
}
