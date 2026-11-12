import { FILE_ACCEPT, type RecordFileInfo } from "@talaan/shared";
import { Camera, FileText, Upload } from "lucide-react";
import { useRef } from "react";
import { buttonSecondary } from "../../../ui/styles";

// Where the lab result comes from: a new photo, a file, or one already attached
export function ChooseSource({
  what = "lab",
  attached,
  onFile,
  onAttached,
}: {
  // A lab result's rows, or a whole record
  what?: "lab" | "record";
  // Photos and PDFs already on this record
  attached: RecordFileInfo[];
  onFile: (file: File) => void;
  onAttached: (file: RecordFileInfo) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const take = (list: FileList | null) => {
    const file = list?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="flex flex-col gap-4 p-5">
      <p className="text-muted">
        {what === "lab"
          ? "Talaan reads the tests, results and normal ranges."
          : "Talaan reads the type, title, date, doctor and hospital, and the rest it can find: results, medicines, the reading, the HMO and amounts."}{" "}
        You check each one against the photo before anything goes into the form.
        It's read on this device; nothing is sent anywhere.
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
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => take(event.target.files)}
      />
      <input
        ref={pickRef}
        type="file"
        accept={FILE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label={
          what === "lab"
            ? "Choose a lab result photo or PDF to read"
            : "Choose a photo or PDF to read"
        }
        onChange={(event) => take(event.target.files)}
      />
      {attached.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">
            Or one already on this record:
          </p>
          <ul className="flex flex-col gap-1">
            {attached.map((file) => (
              <li key={file.id}>
                <button
                  type="button"
                  onClick={() => onAttached(file)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-edge px-3 py-2 text-left text-sm hover:border-brand"
                >
                  <FileText
                    aria-hidden="true"
                    className="size-4 shrink-0 text-brand"
                  />
                  <span className="truncate">{file.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted">
        Works best with a clear, straight photo of a printed result, in good
        light. Handwriting is hard to read: check it closely.
      </p>
    </div>
  );
}
