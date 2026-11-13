import type { PlaceInfo } from "@talaan/shared";
import { QrCode } from "./QrCode";
import { labelUrl, shownCode } from "@talaan/client";

// The place's QR label, as it prints
export function LabelPreview({ place }: { place: PlaceInfo }) {
  return (
    <section aria-labelledby="label-heading" className="flex flex-col gap-2">
      <h2 id="label-heading" className="text-lg font-bold">
        QR label
      </h2>
      <div className="flex items-center gap-4 rounded-xl border border-edge bg-white p-4">
        <QrCode
          text={labelUrl(place.code)}
          title={`QR label for ${place.name}`}
          className="size-28 shrink-0"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-lg font-bold tracking-wider">
            {shownCode(place.code)}
          </span>
          <span className="text-sm text-muted">
            Stick it on {place.name}. Scanning it with a phone camera opens this
            page (after signing in). Without a QR scanner, type the code at
            Places › Find a label.
          </span>
        </div>
      </div>
    </section>
  );
}
