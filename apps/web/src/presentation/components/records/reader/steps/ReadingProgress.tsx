import type { ReadProgress } from "../../../../../infrastructure/reader/progress";

// "Getting the reader ready…" (first time only), then "Reading…"
export function ReadingProgress({
  name,
  progress,
}: {
  name: string;
  progress: ReadProgress;
}) {
  const percent = Math.round(progress.fraction * 100);
  const label =
    progress.step === "preparing"
      ? "Getting the reader ready… The first time, this downloads about 7 MB."
      : "Reading the lab results…";
  return (
    <div className="flex flex-col gap-3 p-6" aria-live="polite">
      <p className="font-semibold break-words">{name}</p>
      <p className="text-sm text-muted">{label}</p>
      <span
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-page"
      >
        <span
          className="block h-full rounded-full bg-brand transition-[width]"
          style={{ width: `${Math.max(4, percent)}%` }}
        />
      </span>
      <p className="text-xs text-muted">
        It's read on this device. The photo isn't sent anywhere to be read.
      </p>
    </div>
  );
}
