import {
  FILE_ACCEPT,
  FILE_LIMITS,
  formatBytes,
  type RecordFileInfo,
} from "@talaan/shared";
import {
  Camera,
  Download,
  ExternalLink,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useRecordFiles,
  useRemoveRecordFile,
  useUploadRecordFile,
} from "../../../application/records/useRecordFiles";
import { fileUrl } from "../../../infrastructure/api/filesApi";
import { shortDateTime } from "../../format/dates";
import { errorMessage } from "../../format/errorMessage";
import { fileProblem } from "../../format/fileCheck";
import { ErrorAlert } from "../ui/ErrorAlert";
import { buttonSecondary } from "../ui/styles";

interface Upload {
  key: number;
  name: string;
  progress: number;
  state: "waiting" | "uploading" | "saving" | "failed";
  error?: string;
}

const linkButton =
  "cursor-pointer text-sm font-semibold text-brand underline disabled:opacity-60";

// The photos and PDFs on a record: the X-ray film, the lab printout, the SOA
export function RecordFilesSection({
  recordId,
  canChange,
}: {
  recordId: string;
  canChange: boolean;
}) {
  const files = useRecordFiles(recordId);
  const upload = useUploadRecordFile(recordId);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [viewing, setViewing] = useState<RecordFileInfo | null>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const nextKey = useRef(1);
  const list = files.data ?? [];
  const room = FILE_LIMITS.perRecord - list.length;

  function patch(key: number, change: Partial<Upload>) {
    setUploads((all) =>
      all.map((u) => (u.key === key ? { ...u, ...change } : u)),
    );
  }

  // One at a time, so a slow phone connection isn't split many ways
  async function addFiles(chosen: FileList | null) {
    if (!chosen || chosen.length === 0) return;
    const items = Array.from(chosen).map((file, index) => {
      const problem =
        index >= room
          ? `A record holds up to ${FILE_LIMITS.perRecord} files.`
          : fileProblem(file);
      return {
        file,
        entry: {
          key: nextKey.current++,
          name: file.name || "photo.jpg",
          progress: 0,
          state: problem ? "failed" : "waiting",
          error: problem ?? undefined,
        } as Upload,
      };
    });
    setUploads((all) => [...all, ...items.map((i) => i.entry)]);
    for (const { file, entry } of items) {
      if (entry.state === "failed") continue;
      patch(entry.key, { state: "uploading" });
      try {
        await upload.mutateAsync({
          file,
          onProgress: (fraction) =>
            patch(entry.key, {
              progress: fraction,
              state: fraction >= 1 ? "saving" : "uploading",
            }),
        });
        setUploads((all) => all.filter((u) => u.key !== entry.key));
      } catch (error) {
        patch(entry.key, { state: "failed", error: errorMessage(error) });
      }
    }
  }

  return (
    <section aria-labelledby="files-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="files-heading" className="text-lg font-bold">
          Photos and files
        </h2>
        {list.length > 0 && (
          <span className="text-sm text-muted">
            {list.length} of {FILE_LIMITS.perRecord}
          </span>
        )}
      </div>
      {files.isError && <ErrorAlert message={errorMessage(files.error)} />}

      {list.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((file) => (
            <FileTile
              key={file.id}
              file={file}
              onOpen={() => setViewing(file)}
            />
          ))}
        </ul>
      )}
      {files.isSuccess && list.length === 0 && uploads.length === 0 && (
        <p className="text-sm text-muted">
          {canChange
            ? "Add a photo of the paper (the X-ray film, the printout, the receipt) or a PDF, so it's here even if the paper gets lost."
            : "No photos or files yet."}
        </p>
      )}

      {uploads.length > 0 && (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {uploads.map((u) => (
            <li
              key={u.key}
              className="flex flex-col gap-1.5 rounded-lg border border-edge bg-white px-3 py-2"
            >
              <span className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{u.name}</span>
                {u.state === "failed" ? (
                  <button
                    type="button"
                    onClick={() =>
                      setUploads((all) => all.filter((x) => x.key !== u.key))
                    }
                    className={linkButton}
                  >
                    Dismiss
                  </button>
                ) : (
                  <span className="shrink-0 text-muted">
                    {u.state === "waiting"
                      ? "Waiting…"
                      : u.state === "saving"
                        ? "Checking…"
                        : `${Math.round(u.progress * 100)}%`}
                  </span>
                )}
              </span>
              {u.state === "failed" ? (
                <span className="text-sm font-medium text-danger">
                  {u.error}
                </span>
              ) : (
                <span
                  role="progressbar"
                  aria-label={`Uploading ${u.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(u.progress * 100)}
                  className="h-1.5 overflow-hidden rounded-full bg-page"
                >
                  <span
                    className="block h-full rounded-full bg-brand transition-[width]"
                    style={{ width: `${Math.max(4, u.progress * 100)}%` }}
                  />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {canChange && room > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* On a phone this opens the camera, for photographing the paper */}
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
            Add photos or PDFs
          </button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={pickRef}
            type="file"
            accept={FILE_ACCEPT}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose photos or PDFs"
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      )}
      {canChange && (
        <p className="text-xs text-muted">
          JPG, PNG, WEBP, HEIC or PDF, up to {formatBytes(FILE_LIMITS.maxBytes)}{" "}
          each. Files are private: only people who can see this record can open
          them.
        </p>
      )}

      {viewing && (
        <FileViewer
          file={viewing}
          canChange={canChange}
          onClose={() => setViewing(null)}
        />
      )}
    </section>
  );
}

function FileTile({
  file,
  onOpen,
}: {
  file: RecordFileInfo;
  onOpen: () => void;
}) {
  const [noPicture, setNoPicture] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${file.name}`}
        className="flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-edge bg-white text-left hover:border-brand"
      >
        <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-page">
          {noPicture ? (
            <span className="flex flex-col items-center gap-1 text-muted">
              <FileText aria-hidden="true" className="size-10" />
              <span className="text-xs font-bold uppercase">{file.format}</span>
            </span>
          ) : (
            <img
              src={fileUrl(file.id, "thumb")}
              alt=""
              loading="lazy"
              onError={() => setNoPicture(true)}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          )}
        </span>
        <span className="flex flex-col px-3 py-2">
          <span className="truncate text-sm font-medium">{file.name}</span>
          <span className="text-xs text-muted">
            {formatBytes(file.bytes)}
            {file.pages ? ` · ${file.pages} pages` : ""}
          </span>
        </span>
      </button>
    </li>
  );
}

function FileViewer({
  file,
  canChange,
  onClose,
}: {
  file: RecordFileInfo;
  canChange: boolean;
  onClose: () => void;
}) {
  const remove = useRemoveRecordFile();
  const [confirming, setConfirming] = useState(false);
  const [noPicture, setNoPicture] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isPdf = file.format === "pdf";

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
      aria-label={file.name}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white">
        <div className="flex items-start justify-between gap-3 border-b border-edge px-4 py-3">
          <span className="flex min-w-0 flex-col">
            <strong className="truncate">{file.name}</strong>
            <span className="text-xs text-muted">
              {formatBytes(file.bytes)} · added
              {file.uploadedByName ? ` by ${file.uploadedByName}` : ""} on{" "}
              {shortDateTime(file.createdAt)}
            </span>
          </span>
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
        <div className="flex min-h-48 flex-1 items-center justify-center overflow-auto bg-page">
          {isPdf || noPicture ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center text-muted">
              <FileText aria-hidden="true" className="size-14" />
              <p>
                {isPdf
                  ? "Open the PDF to read it."
                  : "This browser can't show this photo. Download it to see it."}
              </p>
            </div>
          ) : (
            <img
              src={fileUrl(file.id, "preview")}
              alt={file.name}
              onError={() => setNoPicture(true)}
              className="max-h-[70vh] w-auto object-contain"
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-edge px-4 py-3">
          <a
            href={fileUrl(file.id, "original")}
            target="_blank"
            rel="noopener"
            className={buttonSecondary}
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            {isPdf ? "Open PDF" : "Open full size"}
          </a>
          <a
            href={fileUrl(file.id, "original", true)}
            className={buttonSecondary}
          >
            <Download aria-hidden="true" className="size-4" />
            Download
          </a>
          {canChange &&
            (confirming ? (
              <span className="flex flex-wrap items-center gap-3 text-sm">
                <span>Remove this file?</span>
                <button
                  type="button"
                  onClick={() => remove.mutate(file.id, { onSuccess: onClose })}
                  disabled={remove.isPending}
                  className="cursor-pointer font-semibold text-danger underline"
                >
                  Yes, remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className={linkButton}
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className={`${linkButton} ml-auto`}
              >
                Remove
              </button>
            ))}
        </div>
        {remove.isError && (
          <div className="px-4 pb-3">
            <ErrorAlert message={errorMessage(remove.error)} />
          </div>
        )}
      </div>
    </div>
  );
}
