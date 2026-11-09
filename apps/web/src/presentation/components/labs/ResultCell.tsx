import type { LabPoint } from "@talaan/shared";
import { LabFlagBadge } from "../records/LabFlagBadge";

// One result: the value (red when out of range), Low/High, and a mark when
// it was converted from another unit
export function ResultCell({
  point,
  unit,
  explain = false,
}: {
  point: LabPoint;
  // The test's unit, shown only when this result is in another one
  unit: string;
  // Say what it was converted from in words (not only on hover)
  explain?: boolean;
}) {
  const note = point.converted
    ? `Converted from ${point.written} ${point.writtenUnit}`
    : point.otherUnit
      ? `In ${point.writtenUnit}: can't be converted to ${unit}`
      : undefined;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`font-semibold tabular-nums ${point.flag ? "text-danger" : ""}`}
        title={note}
      >
        {point.shown}
        {point.otherUnit && (
          <span className="ml-1 text-xs font-normal">{point.writtenUnit}</span>
        )}
        {point.converted && (
          <sup aria-label={note} className="ml-0.5 text-brand">
            *
          </sup>
        )}
      </span>
      <LabFlagBadge flag={point.flag} />
      {explain && point.converted && (
        <span className="text-xs text-muted">
          (from {point.written} {point.writtenUnit})
        </span>
      )}
    </span>
  );
}
