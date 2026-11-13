import type { ReadLabDocument } from "../../../../../infrastructure/reader/readLabDocument";
import { CheckRows } from "../check/CheckRows";
import type { CheckRow } from "@talaan/client";

// The picture beside the rows it gave, to compare one against the other
export function CheckStep({
  name,
  result,
  rows,
  onChange,
}: {
  name: string;
  result: ReadLabDocument;
  rows: CheckRow[];
  onChange: (rows: CheckRow[]) => void;
}) {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2">
      {/* On a phone the picture scrolls in a short box so the rows show */}
      <div className="flex max-h-[38vh] flex-col gap-2 overflow-auto rounded-lg md:sticky md:top-0 md:max-h-[70vh]">
        {result.pictures.map((src, index) => (
          <img
            key={index}
            src={src}
            alt={`${name}, page ${index + 1}`}
            className="w-full rounded-lg border border-edge"
          />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {rows.length > 0 ? (
          <p className="text-sm text-muted">
            {result.from === "text"
              ? "Taken from the PDF's own text. Still check each row against the page."
              : "Compare each row with the photo and fix anything that's wrong. Rows marked in amber need a closer look."}
          </p>
        ) : (
          <p className="rounded-lg border border-warn-edge bg-warn-soft p-3 text-sm text-warn">
            No lab results were found. Try a clearer, straighter photo in good
            light, or type the results in.
          </p>
        )}
        <CheckRows rows={rows} onChange={onChange} />
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-brand">
            Show all the text it read
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-page p-3 text-xs whitespace-pre-wrap">
            {result.lines.map((l) => l.text).join("\n") || "(nothing)"}
          </pre>
        </details>
      </div>
    </div>
  );
}
