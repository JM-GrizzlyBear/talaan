import { formatBytes, type RecordFileInfo } from "@talaan/shared";
import { FileText } from "lucide-react";
import { useState } from "react";
import { fileUrl } from "@talaan/client";

// A file as a small picture (or a PDF icon) with its name and size
export function FileTile({
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
