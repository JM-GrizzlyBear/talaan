import type { LabPoint } from "@talaan/shared";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

// Up, down or the same since the result before
export function TrendArrow({
  point,
  previous,
}: {
  point: LabPoint;
  previous: LabPoint | undefined;
}) {
  if (
    !previous ||
    point.value === null ||
    previous.value === null ||
    point.otherUnit ||
    previous.otherUnit
  ) {
    return null;
  }
  const diff = point.value - previous.value;
  const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus;
  const label =
    diff > 0
      ? "Up since last time"
      : diff < 0
        ? "Down since last time"
        : "Same as last time";
  return (
    <Icon
      aria-label={label}
      className={`inline size-3.5 ${point.flag ? "text-danger" : "text-muted"}`}
    />
  );
}
