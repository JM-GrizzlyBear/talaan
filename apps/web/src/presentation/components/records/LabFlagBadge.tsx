import type { LabFlag } from "@talaan/shared";

// "Low" or "High" in red, for a result outside its normal range
export function LabFlagBadge({
  flag,
  className = "",
}: {
  flag: LabFlag;
  className?: string;
}) {
  if (!flag) return null;
  return (
    <span
      className={`rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger ${className}`}
    >
      {flag === "low" ? "Low" : "High"}
    </span>
  );
}
