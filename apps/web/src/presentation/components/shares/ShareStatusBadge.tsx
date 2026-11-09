import { SHARE_STATUS_LABELS, type ShareStatus } from "@talaan/shared";

const COLORS: Record<ShareStatus, string> = {
  open: "bg-brand-soft text-deep",
  used: "bg-amber-50 text-amber-900",
  expired: "bg-gray-100 text-gray-700",
  stopped: "bg-red-50 text-red-800",
};

export function ShareStatusBadge({ status }: { status: ShareStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${COLORS[status]}`}
    >
      {SHARE_STATUS_LABELS[status]}
    </span>
  );
}
