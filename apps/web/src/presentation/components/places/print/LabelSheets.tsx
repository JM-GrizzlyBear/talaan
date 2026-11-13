import { useEffect, useRef, useState } from "react";
import type { SheetLayout } from "@talaan/client";
import { PrintLabel, type LabelItem } from "./PrintLabel";
import type { Size } from "@talaan/client";

// 1 mm in CSS pixels
const MM = 96 / 25.4;

// The sheets at their real size. On screen they shrink to fit the width;
// printed, each sheet is one page of exactly that paper size.
export function LabelSheets({
  sheets,
  paper,
  label,
  layout,
  cutLines,
}: {
  sheets: (LabelItem | null)[][];
  paper: Size;
  label: Size;
  layout: SheetLayout;
  cutLines: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () =>
      setZoom(Math.min(1, box.clientWidth / (paper.width * MM)));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [paper.width]);

  return (
    <div ref={boxRef} className="w-full print:block">
      {/* The printer's page: this paper, no browser margins */}
      <style>{`@page { size: ${paper.width}mm ${paper.height}mm; margin: 0; }`}</style>
      <div
        className="flex flex-col items-start gap-6 print:gap-0 print:[zoom:1]"
        style={{ zoom }}
      >
        {sheets.map((sheet, index) => (
          <div
            key={index}
            aria-label={`Sheet ${index + 1} of ${sheets.length}`}
            className="paper relative shrink-0 bg-white shadow-md ring-1 ring-edge print:break-after-page print:shadow-none print:ring-0"
            style={{ width: `${paper.width}mm`, height: `${paper.height}mm` }}
          >
            <div
              className="absolute grid"
              style={{
                left: `${layout.left}mm`,
                top: `${layout.top}mm`,
                gridTemplateColumns: `repeat(${layout.columns}, ${label.width}mm)`,
                gridAutoRows: `${label.height}mm`,
              }}
            >
              {sheet.map((item, slot) => (
                <div
                  key={slot}
                  className={
                    cutLines && item
                      ? "outline-[0.2mm] -outline-offset-[0.1mm] outline-gray-400 outline-dashed"
                      : ""
                  }
                >
                  {item && <PrintLabel item={item} size={label} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
