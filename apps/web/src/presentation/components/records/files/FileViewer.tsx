import { formatBytes, type RecordFileInfo } from "@talaan/shared";
import { Download, ExternalLink, FileText, ScanText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRemoveRecordFile, fileUrl, shortDateTime } from "@talaan/client";
import { errorMessage } from "../../../format/errorMessage";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { buttonSecondary, linkButton } from "../../ui/styles";

// A file opened over the page: full size, open, download, remove
export function FileViewer({
  file,
  canChange,
  onClose,
  onRead,
}: {
  file: RecordFileInfo;
  canChange: boolean;
  onClose: () => void;
  // Lab results: read this file's values into the record
  onRead?: () => void;
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
          {onRead && (
            <button type="button" onClick={onRead} className={buttonSecondary}>
              <ScanText aria-hidden="true" className="size-4" />
              Read lab values from this
            </button>
          )}
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
