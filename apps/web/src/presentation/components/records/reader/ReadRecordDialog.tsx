import type { RecordFileInfo } from "@talaan/shared";
import { useEffect, useRef, useState } from "react";
import { useLabReader } from "../../../../application/reader/useLabReader";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { buttonPrimary, buttonSecondary } from "../../ui/styles";
import { type RecordFormState, todayLocal } from "../form/recordFormState";
import { chosenRows, toCheckRows, type CheckRow } from "./check/checkRows";
import {
  applyChecks,
  type DetailCheck,
  doubtCount,
  type MedicineCheck,
  notFound,
  toDetailChecks,
  toMedicineChecks,
} from "./details/detailChecks";
import { DetailsCheckStep } from "./details/DetailsCheckStep";
import { ReaderFrame } from "./ReaderFrame";
import { canRead } from "./readableFiles";
import { ChooseSource } from "./steps/ChooseSource";
import { ReadingProgress } from "./steps/ReadingProgress";

// Read a whole record from a photo or PDF: the type, title, date
// (month/day/year), doctor, hospital, and the parts for its type. Everything
// is checked here first; nothing is saved until the form's Save.
export function ReadRecordDialog({
  form,
  attached,
  startWith,
  onApply,
  onClose,
}: {
  form: RecordFormState;
  // Photos and PDFs already on the record
  attached: RecordFileInfo[];
  // Read this new photo straight away (just taken or chosen)
  startWith?: File;
  // The filled form, and the new photo (to add to the record on save)
  onApply: (form: RecordFormState, file: File | null, doubts: number) => void;
  onClose: () => void;
}) {
  const { state, read, readAttached, reset } = useLabReader();
  const [checks, setChecks] = useState<DetailCheck[]>([]);
  const [medicines, setMedicines] = useState<MedicineCheck[]>([]);
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [file, setFile] = useState<File | null>(startWith ?? null);

  const started = useRef(false);
  useEffect(() => {
    if (startWith && !started.current) {
      started.current = true;
      void read(startWith);
    }
  }, [startWith, read]);

  // A new reading replaces what's being checked (set while rendering)
  const [shownState, setShownState] = useState(state);
  if (state !== shownState) {
    setShownState(state);
    if (state.step === "check") {
      const d = state.result.details;
      setChecks(toDetailChecks(d, form, todayLocal()));
      setMedicines(toMedicineChecks(d));
      setRows(toCheckRows(d.labRows));
    }
  }

  const type =
    (checks.find((c) => c.key === "type" && c.include)?.value as
      RecordFormState["type"] | undefined) ?? form.type;
  const unsure =
    doubtCount(checks, medicines) +
    rows.filter((r) => r.include && r.doubts.length > 0).length;

  const apply = () => {
    const next = applyChecks(form, checks, chosenRows(rows), medicines);
    onApply(next, file, unsure);
  };

  return (
    <ReaderFrame
      title={
        state.step === "check"
          ? "Check what was read"
          : "Read from a photo or PDF"
      }
      onClose={onClose}
      buttons={
        <>
          {state.step === "check" && (
            <button type="button" onClick={apply} className={buttonPrimary}>
              Use in the form
            </button>
          )}
          {(state.step === "check" || state.step === "failed") && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
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
        </>
      }
    >
      {state.step === "choose" && (
        <ChooseSource
          what="record"
          attached={attached.filter(canRead)}
          onFile={(f) => {
            setFile(f);
            void read(f);
          }}
          onAttached={(f) => {
            setFile(null);
            void readAttached(f);
          }}
        />
      )}
      {state.step === "reading" && (
        <ReadingProgress name={state.name} progress={state.progress} />
      )}
      {state.step === "failed" && (
        <div className="flex flex-col gap-3 p-5">
          <ErrorAlert message={state.message} />
          {file && (
            <button
              type="button"
              onClick={() => onApply(form, file, 0)}
              className={`${buttonSecondary} self-start`}
            >
              Just add the photo, and type the rest
            </button>
          )}
        </div>
      )}
      {state.step === "check" && (
        <DetailsCheckStep
          name={state.name}
          result={state.result}
          checks={checks}
          medicines={medicines}
          rows={rows}
          missing={notFound(state.result.details, type)}
          onChecks={setChecks}
          onMedicines={setMedicines}
          onRows={setRows}
        />
      )}
    </ReaderFrame>
  );
}
