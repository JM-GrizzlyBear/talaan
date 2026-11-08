import { FILE_LIMITS, formatBytes, type RecordFileInfo } from "@talaan/shared";
import { useState } from "react";
import { useRecordFiles } from "../../../../application/records/useRecordFiles";
import { errorMessage } from "../../../format/errorMessage";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { FilePickers } from "./FilePickers";
import { FileTile } from "./FileTile";
import { FileViewer } from "./FileViewer";
import { UploadList } from "./UploadList";
import { useFileUploads } from "./useFileUploads";

// The photos and PDFs on a record: the X-ray film, the lab printout, the SOA
export function RecordFilesSection({
  recordId,
  canChange,
  onReadFile,
}: {
  recordId: string;
  canChange: boolean;
  // Lab results: "Read lab values from this" on a file
  onReadFile?: (file: RecordFileInfo) => void;
}) {
  const files = useRecordFiles(recordId);
  const [viewing, setViewing] = useState<RecordFileInfo | null>(null);
  const list = files.data ?? [];
  const room = FILE_LIMITS.perRecord - list.length;
  const { uploads, addFiles, dismiss } = useFileUploads(recordId, room);

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
        <UploadList uploads={uploads} onDismiss={dismiss} />
      )}

      {canChange && room > 0 && (
        <FilePickers onFiles={(chosen) => void addFiles(chosen)} />
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
          onRead={onReadFile ? () => onReadFile(viewing) : undefined}
        />
      )}
    </section>
  );
}
