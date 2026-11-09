import type { ShareViewInfo } from "@talaan/shared";
import { shortDateTime } from "../../format/dates";
import { listCard } from "../ui/styles";

// Every device that opened the link, newest first
export function ViewsList({ views }: { views: ShareViewInfo[] }) {
  if (views.length === 0) {
    return <p className="text-sm text-muted">Nobody has opened it yet.</p>;
  }
  return (
    <ul className={listCard}>
      {views.map((v, i) => (
        <li
          key={`${v.openedAt}-${i}`}
          className="flex flex-wrap justify-between gap-x-3 px-4 py-2.5 text-sm"
        >
          <span className="font-medium">{v.device || "A browser"}</span>
          <span className="text-muted">{shortDateTime(v.openedAt)}</span>
        </li>
      ))}
    </ul>
  );
}
