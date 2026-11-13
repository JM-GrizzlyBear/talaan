import type { RecordFileInfo } from "@talaan/shared";
import { useEffect, useRef, useState } from "react";
import { useLabReader } from "../../../../application/reader/useLabReader";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { buttonPrimary, buttonSecondary } from "../../ui/styles";
import {
  type LabRow,
  chosenRows,
  toCheckRows,
  type CheckRow,
  canRead,
} from "@talaan/client";
import { ReaderFrame } from "./ReaderFrame";
import { CheckStep } from "./steps/CheckStep";
import { ChooseSource } from "./steps/ChooseSource";
import { ReadingProgress } from "./steps/ReadingProgress";

// Read lab results from a photo or PDF, then check them before they go into
// the form. Nothing is saved here: the form's Save does that.
// Steps: choose → reading → check (or failed)
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
  const { state, read, readAttached, reset } = useLabReader();
  const [rows, setRows] = useState<CheckRow[]>([]);

  // Only once, for the file it was opened with
  const started = useRef(false);
  useEffect(() => {
    if (startWith && !started.current) {
      started.current = true;
      void readAttached(startWith);
    }
  }, [startWith, readAttached]);

  // A new reading replaces the rows (set while rendering, not in an effect)
  const [shown, setShown] = useState(state);
  if (state !== shown) {
    setShown(state);
    if (state.step === "check") setRows(toCheckRows(state.result.rows));
  }

  const chosen = rows.filter((r) => r.include).length;

  return (
    <ReaderFrame
      title={state.step === "check" ? "Check the results" : "Read lab results"}
      onClose={onClose}
      buttons={
        <>
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
          {(state.step === "check" || state.step === "failed") && (
            <button type="button" onClick={reset} className={buttonSecondary}>
              Read another
            </button>
          )}
          <button type="button" onClick={onClose} className={buttonSecondary}>
            Cancel
          </button>
        </>
      }
    >
      {state.step === "choose" && (
        <ChooseSource
          attached={attached.filter(canRead)}
          onFile={(file) => void read(file)}
          onAttached={(file) => void readAttached(file)}
        />
      )}
      {state.step === "reading" && (
        <ReadingProgress name={state.name} progress={state.progress} />
      )}
      {state.step === "failed" && (
        <div className="p-5">
          <ErrorAlert message={state.message} />
        </div>
      )}
      {state.step === "check" && (
        <CheckStep
          name={state.name}
          result={state.result}
          rows={rows}
          onChange={setRows}
        />
      )}
    </ReaderFrame>
  );
}
