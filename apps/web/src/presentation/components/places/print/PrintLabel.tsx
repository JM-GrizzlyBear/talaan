import { PLACE_KIND_LABELS, type PlaceKind } from "@talaan/shared";
import { QrCode } from "../QrCode";
import { labelUrl, shownCode, type Size } from "@talaan/client";

export interface LabelItem {
  code: string;
  // A blank label has no name yet: a line to write one on
  name: string | null;
  kind: PlaceKind | null;
}

const clamp = (min: number, value: number, max: number) =>
  Math.min(max, Math.max(min, value));

// One label, drawn at its real size in millimetres: the QR code on the left,
// the name, kind and code on the right
export function PrintLabel({ item, size }: { item: LabelItem; size: Size }) {
  const pad = clamp(1.5, size.height * 0.08, 3);
  // At most 45% of the width, so there's room for the name beside it
  const qr = Math.min(size.height - 2 * pad, size.width * 0.45);
  const textWidth = size.width - qr - 3 * pad;
  // Too little room beside the QR code for a name (tiny labels): just the code
  const compact = textWidth < 16;
  const nameSize = clamp(2.4, size.height * 0.11, 5);
  const smallSize = clamp(1.8, nameSize * 0.72, 3.2);

  return (
    <div
      className="paper flex items-center overflow-hidden bg-white text-black"
      style={{
        width: `${size.width}mm`,
        height: `${size.height}mm`,
        padding: `${pad}mm`,
        gap: `${pad}mm`,
      }}
    >
      <QrCode
        text={labelUrl(item.code)}
        title={`QR code ${shownCode(item.code)}`}
        className="shrink-0"
        // An inline size in mm, so it prints exactly
        style={{ width: `${qr}mm`, height: `${qr}mm` }}
      />
      <div
        className="flex min-w-0 flex-1 flex-col justify-center"
        style={{ gap: `${pad * 0.4}mm` }}
      >
        {!compact && (
          <>
            {item.name ? (
              <span
                className="line-clamp-2 leading-tight font-bold break-words"
                style={{ fontSize: `${nameSize}mm` }}
              >
                {item.name}
              </span>
            ) : (
              <span style={{ fontSize: `${smallSize}mm` }}>
                Name:
                <span
                  className="mt-[0.5mm] block border-b border-black"
                  style={{ height: `${nameSize * 1.4}mm` }}
                />
              </span>
            )}
            {item.kind && (
              <span style={{ fontSize: `${smallSize}mm` }}>
                {PLACE_KIND_LABELS[item.kind]}
              </span>
            )}
          </>
        )}
        <span
          className="font-mono font-bold tracking-wide"
          style={{
            fontSize: `${compact ? clamp(1.8, textWidth / 6, 3) : smallSize}mm`,
          }}
        >
          {compact ? (
            <>
              {item.code.slice(0, 4)}
              <br />
              {item.code.slice(4)}
            </>
          ) : (
            shownCode(item.code)
          )}
        </span>
        <span
          className="text-gray-600"
          style={{ fontSize: `${smallSize * 0.85}mm` }}
        >
          {item.name ? "Talaan" : "Talaan · scan to name"}
        </span>
      </div>
    </div>
  );
}
