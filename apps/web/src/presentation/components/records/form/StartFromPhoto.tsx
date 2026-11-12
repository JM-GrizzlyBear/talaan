import { FILE_ACCEPT } from "@talaan/shared";
import { Camera, ScanText, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useRecordFiles } from "../../../../application/records/useRecordFiles";
import { Notice } from "../../ui/Notice";
import { buttonSecondary } from "../../ui/styles";
import { ReadRecordDialog } from "../reader/ReadRecordDialog";
import type { RecordFormState } from "./recordFormState";

// A new record: start from the paper. The photo is read on this device right
// away, checked, put in the form, and added to the record when it's saved.
// Editing: read one of the record's files (or a new one) the same way.
export function StartFromPhoto({
  form,
  onForm,
  recordId,
  pending,
  onPending,
}: {
  form: RecordFormState;
  onForm: (form: RecordFormState) => void;
  recordId?: string;
  // New photos to add when the record is saved
  pending: File[];
  onPending: (files: File[]) => void;
}) {
  const files = useRecordFiles(recordId);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState<{ file?: File } | null>(null);
  const [done, setDone] = useState<{ doubts: number } | null>(null);

  const take = (list: FileList | null) => {
    const file = list?.[0];
    if (file) {
      setDone(null);
      setReading({ file });
    }
  };

  return (
    <section
      aria-labelledby="start-photo-heading"
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-brand bg-brand-soft/40 p-4"
    >
      <h2
        id="start-photo-heading"
        className="flex items-center gap-2 font-bold"
      >
        <ScanText aria-hidden="true" className="size-5 text-brand" />
        {recordId ? "Read from a photo or PDF" : "Start from a photo or PDF"}
      </h2>
      <p className="text-sm text-muted">
        Talaan reads the date, doctor, hospital and more, and fills the form.
        You check everything first; anything it can't read stays blank for
        later.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className={buttonSecondary}
        >
          <Camera aria-hidden="true" className="size-4" />
          Take a photo
        </button>
        <button
          type="button"
          onClick={() => pickRef.current?.click()}
          className={buttonSecondary}
        >
          <Upload aria-hidden="true" className="size-4" />
          Choose a photo or PDF
        </button>
        {recordId && (files.data?.length ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setReading({});
            }}
            className={buttonSecondary}
          >
            One already on this record
          </button>
        )}
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={pickRef}
        type="file"
        accept={FILE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a photo or PDF of the record"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      {done && (
        <Notice>
          {done.doubts > 0
            ? `Filled in from the paper. ${done.doubts} ${done.doubts === 1 ? "box was" : "boxes were"} marked Please check: look again before saving.`
            : "Filled in from the paper. Look it over, then save."}
        </Notice>
      )}
      {pending.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">
            Added to the record when you save:
          </span>
          <ul className="flex flex-col gap-1">
            {pending.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-edge bg-white px-3 py-1.5 text-sm"
              >
                <span className="truncate">{file.name || "photo.jpg"}</span>
                <button
                  type="button"
                  aria-label={`Don't add ${file.name || "the photo"}`}
                  onClick={() => onPending(pending.filter((_, j) => j !== i))}
                  className="cursor-pointer rounded p-1 text-muted hover:bg-gray-100"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {reading && (
        <ReadRecordDialog
          form={form}
          attached={files.data ?? []}
          startWith={reading.file}
          onClose={() => setReading(null)}
          onApply={(next, file, doubts) => {
            onForm(next);
            if (file && !pending.includes(file)) onPending([...pending, file]);
            setDone({ doubts });
            setReading(null);
          }}
        />
      )}
    </section>
  );
}
