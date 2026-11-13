import { formatBytes, type RecordFileInfo } from "@talaan/shared";
import { Download, ExternalLink, FileText } from "lucide-react";
import { useState } from "react";
import { sharedFileUrl } from "@talaan/client";

// A record's photos and PDFs on the doctor's page: open or download each
export function SharedFiles({
  token,
  files,
}: {
  token: string;
  files: RecordFileInfo[];
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {files.map((file) => (
        <SharedFile key={file.id} token={token} file={file} />
      ))}
    </ul>
  );
}

function SharedFile({ token, file }: { token: string; file: RecordFileInfo }) {
  const [noPicture, setNoPicture] = useState(false);
  const open = sharedFileUrl(token, file.id, "original");
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-edge bg-white">
      <a
        href={open}
        target="_blank"
        rel="noopener"
        aria-label={`Open ${file.name}`}
        className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-page"
      >
        {noPicture ? (
          <span className="flex flex-col items-center gap-1 text-muted">
            <FileText aria-hidden="true" className="size-10" />
            <span className="text-xs font-bold uppercase">{file.format}</span>
          </span>
        ) : (
          <img
            src={sharedFileUrl(token, file.id, "thumb")}
            alt=""
            loading="lazy"
            onError={() => setNoPicture(true)}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        )}
      </a>
      <span className="flex flex-col gap-1 px-3 py-2">
        <span className="truncate text-sm font-medium">{file.name}</span>
        <span className="text-xs text-muted">{formatBytes(file.bytes)}</span>
        <span className="flex gap-3 text-sm print:hidden">
          <a
            href={open}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 font-semibold text-brand underline"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            Open
          </a>
          <a
            href={sharedFileUrl(token, file.id, "original", true)}
            className="inline-flex items-center gap-1 font-semibold text-brand underline"
          >
            <Download aria-hidden="true" className="size-3.5" />
            Download
          </a>
        </span>
      </span>
    </li>
  );
}
