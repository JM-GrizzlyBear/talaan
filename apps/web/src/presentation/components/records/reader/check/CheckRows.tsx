import { CheckRowCard } from "./CheckRowCard";
import type { CheckRow } from "@talaan/client";

// Every read row, each one editable
export function CheckRows({
  rows,
  onChange,
}: {
  rows: CheckRow[];
  onChange: (rows: CheckRow[]) => void;
}) {
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <CheckRowCard
          key={index}
          row={row}
          index={index}
          onChange={(patch) =>
            onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
          }
        />
      ))}
    </ol>
  );
}
