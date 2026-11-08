import { ScanText, X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

// The reader's window: a title, Close (and Escape), the step, the buttons
export function ReaderFrame({
  title,
  onClose,
  children,
  buttons,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  buttons: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-title"
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 sm:items-center sm:p-3"
    >
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-edge px-4 py-3">
          <h2 id="reader-title" className="flex items-center gap-2 font-bold">
            <ScanText aria-hidden="true" className="size-5 text-brand" />
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-1.5 hover:bg-page"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
        <div className="flex flex-wrap items-center gap-2 border-t border-edge px-4 py-3">
          {buttons}
        </div>
      </div>
    </div>
  );
}
