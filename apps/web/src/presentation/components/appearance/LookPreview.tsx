import { Bell } from "lucide-react";
import { buttonPrimary, buttonSecondary } from "../ui/styles";

// A little piece of the website in the chosen look
export function LookPreview() {
  return (
    <div
      aria-label="Preview"
      role="img"
      className="flex flex-col gap-3 rounded-xl border border-edge bg-page p-4"
    >
      <div className="flex flex-col gap-2 rounded-xl border border-edge bg-white p-4">
        <span className="flex items-center justify-between gap-2">
          <strong className="text-lg">CBC</strong>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-deep">
            Lab result
          </span>
        </span>
        <span className="text-sm text-muted">Oct 5, 2026 · St. Luke's</span>
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-deep">
          <Bell aria-hidden="true" className="mr-1 inline size-4" />
          Losartan at 8:00 AM
        </p>
        <span className="flex flex-wrap gap-2">
          <span className={buttonPrimary}>Save</span>
          <span className={buttonSecondary}>Cancel</span>
          <span className="self-center font-semibold text-brand underline">
            A link
          </span>
        </span>
      </div>
    </div>
  );
}
