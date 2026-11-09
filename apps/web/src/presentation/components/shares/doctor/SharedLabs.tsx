import { type LabRecordResults, buildLabSeries } from "@talaan/shared";
import { useMemo, useState } from "react";
import { ChartsGrid } from "../../labs/ChartsGrid";
import { CompareDates } from "../../labs/CompareDates";
import { columnsFor } from "../../labs/labFilters";
import { LabTable } from "../../labs/LabTable";
import { NeedsAttention } from "../../labs/NeedsAttention";
import type { RecordLink } from "../../labs/recordLink";
import { TestDetail } from "../../labs/TestDetail";
import { linkButton } from "../../ui/styles";

const VIEWS = [
  ["table", "Table"],
  ["charts", "Charts"],
  ["attention", "Needs attention"],
  ["compare", "Compare two dates"],
] as const;
type View = (typeof VIEWS)[number][0];

// The lab results lined up to compare, like the family's own Lab results page
export function SharedLabs({
  records,
  recordLink,
}: {
  records: LabRecordResults[];
  // A date leads to its record when that record is on the page too
  recordLink: RecordLink;
}) {
  const series = useMemo(() => buildLabSeries(records), [records]);
  const columns = useMemo(() => columnsFor(records, series), [records, series]);
  const [view, setView] = useState<View>("table");
  const [testKey, setTestKey] = useState<string | null>(null);
  const chosen = series.find((s) => s.key === testKey);

  if (records.length === 0) {
    return <p className="text-muted">No lab results yet.</p>;
  }
  if (chosen) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setTestKey(null)}
          className={`${linkButton} self-start`}
        >
          ← All tests
        </button>
        <h3 className="text-xl font-bold">
          {chosen.name}
          {chosen.unit && (
            <span className="text-base font-normal text-muted">
              {" "}
              · {chosen.unit}
            </span>
          )}
        </h3>
        <TestDetail series={chosen} recordLink={recordLink} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto border-b border-edge print:hidden"
      >
        {VIEWS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => setView(value)}
            className={`-mb-px cursor-pointer border-b-2 px-3 py-2 font-semibold whitespace-nowrap ${
              view === value
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "charts" ? (
        <ChartsGrid series={series} onTest={setTestKey} />
      ) : view === "attention" ? (
        <NeedsAttention series={series} onTest={setTestKey} />
      ) : view === "compare" ? (
        <CompareDates series={series} columns={columns} />
      ) : (
        <LabTable
          series={series}
          columns={columns}
          onTest={setTestKey}
          recordLink={recordLink}
        />
      )}
      <p className="text-xs text-muted">
        * Converted from the unit on the record (a test's own view shows the
        original). Low and High follow the normal range printed on each result.
      </p>
    </div>
  );
}
