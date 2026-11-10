import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { QrCode } from "../places/QrCode";
import { buttonPrimary, buttonSecondary, inputBase } from "../ui/styles";

// The link to give the doctor: copy it, send it with the phone's share
// sheet, or let them scan the QR from this screen
export function LinkBox({
  url,
  recipient,
  pin,
}: {
  url: string;
  recipient: string;
  // Only right after making it or changing it: the PIN isn't kept readable
  pin?: string;
}) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <QrCode
        text={url}
        title={`QR code of the link for ${recipient}`}
        className="size-40 shrink-0 self-center rounded-lg border border-edge bg-white p-2 sm:self-start"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          The link
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className={`${inputBase} h-11 border-edge font-mono text-sm`}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            className={buttonPrimary}
          >
            {copied ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            {copied ? "Copied" : "Copy the link"}
          </button>
          {canShare && (
            <button
              type="button"
              onClick={() =>
                void navigator
                  .share({ title: `Health records for ${recipient}`, url })
                  .catch(() => {})
              }
              className={buttonSecondary}
            >
              <Share2 aria-hidden="true" className="size-4" />
              Send…
            </button>
          )}
        </div>
        {pin && (
          <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <p>
              The PIN is{" "}
              <strong className="font-mono text-xl tracking-widest">
                {pin}
              </strong>
            </p>
            <p>
              Write it down or tell it now: Talaan doesn't keep it readable, so
              it won't show again. You can set a new one below.
            </p>
          </div>
        )}
        <p aria-live="polite" className="sr-only">
          {copied ? "Link copied" : ""}
        </p>
      </div>
    </div>
  );
}
