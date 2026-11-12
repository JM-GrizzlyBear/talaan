import type { ReadLabDocument } from "../../../../../infrastructure/reader/readLabDocument";
import { CheckRows } from "../check/CheckRows";
import type { CheckRow } from "../check/checkRows";
import { DetailCheckCard } from "./DetailCheckCard";
import type { DetailCheck, MedicineCheck } from "./detailChecks";
import { MedicineCheckCard } from "./MedicineCheckCard";

// The picture beside everything read from it
export function DetailsCheckStep({
  name,
  result,
  checks,
  medicines,
  rows,
  missing,
  onChecks,
  onMedicines,
  onRows,
}: {
  name: string;
  result: ReadLabDocument;
  checks: DetailCheck[];
  medicines: MedicineCheck[];
  rows: CheckRow[];
  // What the paper didn't have (or couldn't be read)
  missing: string[];
  onChecks: (checks: DetailCheck[]) => void;
  onMedicines: (medicines: MedicineCheck[]) => void;
  onRows: (rows: CheckRow[]) => void;
}) {
  const nothing =
    checks.length === 0 && medicines.length === 0 && rows.length === 0;
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2">
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
        {nothing ? (
          <p className="rounded-lg border border-warn-edge bg-warn-soft p-3 text-sm text-warn">
            Nothing could be read. Try a clearer, straighter photo in good
            light, or type it in. The photo is still added to the record when
            you save.
          </p>
        ) : (
          <p className="text-sm text-muted">
            {result.from === "text"
              ? "Taken from the PDF's own text. Still check it against the page."
              : "Compare each one with the photo and fix anything that's wrong. Boxes marked Please check need a closer look."}{" "}
            Untick anything you don't want.
          </p>
        )}
        {checks.length > 0 && (
          <ul className="flex flex-col gap-2">
            {checks.map((check, i) => (
              <DetailCheckCard
                key={check.key}
                check={check}
                onChange={(patch) =>
                  onChecks(
                    checks.map((c, j) => (j === i ? { ...c, ...patch } : c)),
                  )
                }
              />
            ))}
          </ul>
        )}
        {medicines.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-bold">Medicines</h3>
            <ol className="flex flex-col gap-2">
              {medicines.map((m, i) => (
                <MedicineCheckCard
                  key={i}
                  medicine={m}
                  index={i}
                  onChange={(patch) =>
                    onMedicines(
                      medicines.map((x, j) =>
                        j === i ? { ...x, ...patch } : x,
                      ),
                    )
                  }
                />
              ))}
            </ol>
          </section>
        )}
        {rows.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-bold">Lab results</h3>
            <CheckRows rows={rows} onChange={onRows} />
          </section>
        )}
        {missing.length > 0 && (
          <p className="rounded-lg bg-page p-3 text-sm text-muted">
            <strong className="text-gray-900">Not found:</strong>{" "}
            {missing.join(", ")}. They're left blank: fill them in now, or later
            by editing the record.
          </p>
        )}
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
