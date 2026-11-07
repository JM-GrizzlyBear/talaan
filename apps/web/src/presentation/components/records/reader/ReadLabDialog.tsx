import type { RecordFileInfo } from "@talaan/shared";
import { ScanText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fileUrl } from "../../../../infrastructure/api/filesApi";
import type { LabRow } from "../form/recordFormState";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { buttonPrimary, buttonSecondary } from "../../ui/styles";
import { ChooseSource } from "./ChooseSource";
import { CheckRows } from "./CheckRows";
import { chosenRows, toCheckRows, type CheckRow } from "./checkRows";
import { ReadingProgress } from "./ReadingProgress";
import { useLabReader } from "./useLabReader";

const READABLE = new Set(["jpg", "png", "webp", "heic", "pdf"]);

// Read lab results from a photo or PDF, then check them before they go into
// the form. Nothing is saved here: the form's Save does that.
export function ReadLabDialog({
  attached,
  startWith,
  onAdd,
  onClose,
}: {
  // Photos and PDFs already on the record
  attached: RecordFileInfo[];
  // Read this attached file straight away (from the record page)
  startWith?: RecordFileInfo;
  onAdd: (rows: LabRow[]) => void;
  onClose: () => void;
}) {
  const { state, read, reset } = useLabReader();
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const started = useRef(false);

  async function readAttached(file: RecordFileInfo) {
    setFetchError(null);
    try {
      const response = await fetch(fileUrl(file.id, "original"));
      if (!response.ok) throw new Error(String(response.status));
      await read(await response.blob(), file.name);
    } catch {
      setFetchError(
        "That file couldn't be opened. Check your connection and try again.",
      );
    }
  }

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (startWith && !started.current) {
      started.current = true;
      void readAttached(startWith);
    }
    // Only once, for the file it was opened with
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWith]);

  // A new reading replaces the rows (set while rendering, not in an effect)
  const [shown, setShown] = useState(state);
  if (state !== shown) {
    setShown(state);
    if (state.step === "check") setRows(toCheckRows(state.result.rows));
  }

  const chosen = rows.filter((r) => r.include).length;
  const readable = attached.filter((f) => READABLE.has(f.format));

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
            {state.step === "check" ? "Check the results" : "Read lab results"}
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

        <div className="flex-1 overflow-auto">
          {fetchError && (
            <div className="p-5">
              <ErrorAlert message={fetchError} />
            </div>
          )}
          {state.step === "choose" && !fetchError && (
            <ChooseSource
              attached={readable}
              onFile={(file) => void read(file, file.name || "photo.jpg")}
              onAttached={(file) => void readAttached(file)}
            />
          )}
          {state.step === "reading" && (
            <ReadingProgress name={state.name} progress={state.progress} />
          )}
          {state.step === "failed" && (
            <div className="flex flex-col gap-3 p-5">
              <ErrorAlert message={state.message} />
            </div>
          )}
          {state.step === "check" && (
            <div className="grid gap-4 p-4 md:grid-cols-2">
              {/* On a phone the picture scrolls in a short box so the rows show */}
              <div className="flex max-h-[38vh] flex-col gap-2 overflow-auto rounded-lg md:sticky md:top-0 md:max-h-[70vh]">
                {state.result.pictures.map((src, index) => (
                  <img
                    key={index}
                    src={src}
                    alt={`${state.name}, page ${index + 1}`}
                    className="w-full rounded-lg border border-edge"
                  />
                ))}
              </div>
              <div className="flex flex-col gap-3">
                {rows.length > 0 ? (
                  <p className="text-sm text-muted">
                    {state.result.from === "text"
                      ? "Taken from the PDF's own text. Still check each row against the page."
                      : "Compare each row with the photo and fix anything that's wrong. Rows marked in amber need a closer look."}
                  </p>
                ) : (
                  <p className="rounded-lg border border-warn-edge bg-warn-soft p-3 text-sm text-warn">
                    No lab results were found. Try a clearer, straighter photo
                    in good light, or type the results in.
                  </p>
                )}
                <CheckRows rows={rows} onChange={setRows} />
                <details className="text-sm">
                  <summary className="cursor-pointer font-semibold text-brand">
                    Show all the text it read
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-page p-3 text-xs whitespace-pre-wrap">
                    {state.result.lines.map((l) => l.text).join("\n") ||
                      "(nothing)"}
                  </pre>
                </details>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-edge px-4 py-3">
          {state.step === "check" && rows.length > 0 && (
            <button
              type="button"
              onClick={() => onAdd(chosenRows(rows))}
              disabled={chosen === 0}
              className={buttonPrimary}
            >
              Add {chosen} {chosen === 1 ? "result" : "results"} to the form
            </button>
          )}
          {(state.step === "check" ||
            state.step === "failed" ||
            fetchError) && (
            <button
              type="button"
              onClick={() => {
                setFetchError(null);
                reset();
              }}
              className={buttonSecondary}
            >
              Read another
            </button>
          )}
          <button type="button" onClick={onClose} className={buttonSecondary}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
