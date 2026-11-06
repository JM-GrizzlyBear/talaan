import { linkButton } from "../../ui/styles";
import type { FileUpload } from "./useFileUploads";

// Files on their way up: a progress bar each, or what went wrong
export function UploadList({
  uploads,
  onDismiss,
}: {
  uploads: FileUpload[];
  onDismiss: (key: number) => void;
}) {
  return (
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
                onClick={() => onDismiss(u.key)}
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
            <span className="text-sm font-medium text-danger">{u.error}</span>
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
  );
}
