import {
  needsAttention,
  type LabRecordResults,
  type LabSeries,
} from "@talaan/shared";
import { useEffect, useRef, useState } from "react";
import { ChartsGrid } from "../ChartsGrid";
import { LabTable } from "../LabTable";
import { NeedsAttention } from "../NeedsAttention";
import { pageSize, type LabPrintSettings } from "./labPrintSettings";

const MM = 96 / 25.4;
const MARGIN = 12;

// What prints, laid out on the chosen page. On screen it's a preview that
// shrinks to fit; printed, the browser breaks it into pages of that size.
export function LabPrintPages({
  settings,
  personName,
  series,
  columns,
}: {
  settings: LabPrintSettings;
  personName: string;
  series: LabSeries[];
  // Newest first
  columns: LabRecordResults[];
}) {
  const page = pageSize(settings);
  const boxRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => setZoom(Math.min(1, box.clientWidth / (page.width * MM)));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [page.width]);

  const shown = settings.dates ? columns.slice(0, settings.dates) : columns;
  const shownIds = new Set(shown.map((c) => c.recordId));
  const tableSeries = series.filter((s) =>
    s.points.some((p) => shownIds.has(p.recordId)),
  );
  const printed = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const attention = needsAttention(series);

  return (
    <div ref={boxRef} className="w-full">
      <style>{`@page { size: ${page.width}mm ${page.height}mm; margin: ${MARGIN}mm; }`}</style>
      <div
        className="bg-white text-black shadow-md ring-1 ring-edge print:w-auto! print:p-0! print:shadow-none print:ring-0 print:[zoom:1]"
        style={{
          width: `${page.width}mm`,
          minHeight: `${page.height}mm`,
          padding: `${MARGIN}mm`,
          zoom,
        }}
      >
        <header className="mb-4 flex items-end justify-between gap-4 border-b-2 border-black pb-2">
          <div>
            <h1 className="text-xl font-bold">Lab results: {personName}</h1>
            <p className="text-xs">
              {columns.length} lab {columns.length === 1 ? "record" : "records"}
              {columns.length > 0 &&
                `, ${columns.at(-1)!.date} to ${columns[0].date}`}
            </p>
          </div>
          <p className="text-right text-xs">
            Printed {printed}
            <br />
            from Talaan
          </p>
        </header>

        {settings.attention && (
          <section className="mb-5">
            <h2 className="mb-2 text-base font-bold">
              Needs attention ({attention.length})
            </h2>
            <NeedsAttention series={series} />
          </section>
        )}
        {settings.table && (
          <section className="mb-5">
            <h2 className="mb-2 text-base font-bold">
              Results
              {settings.dates > 0 &&
                columns.length > settings.dates &&
                ` (the latest ${settings.dates} of ${columns.length} dates)`}
            </h2>
            <LabTable series={tableSeries} columns={shown} print />
          </section>
        )}
        {settings.charts && (
          <section className="mb-5 break-before-auto">
            <h2 className="mb-2 text-base font-bold">Charts</h2>
            <ChartsGrid series={series} print />
          </section>
        )}
        <p className="mt-4 border-t border-black pt-2 text-[10px]">
          * Converted from another unit. Low and High follow the normal range
          printed on each result. For discussing with a doctor; not a diagnosis.
        </p>
      </div>
    </div>
  );
}
