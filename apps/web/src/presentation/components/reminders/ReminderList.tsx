import { describeSchedule, type ReminderSummary } from "@talaan/shared";
import { BellOff, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { listCard } from "../ui/styles";
import { ReminderKindIcon } from "./ReminderKindIcon";
import { whenText } from "./reminderTimes";

// Every reminder of an account, with how often and the next time
export function ReminderList({ reminders }: { reminders: ReminderSummary[] }) {
  return (
    <ul className={listCard}>
      {reminders.map((r) => (
        <li key={r.id}>
          <Link
            to={`/reminders/${r.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
              <ReminderKindIcon kind={r.kind} className="size-5 text-brand" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                {r.title}
                {r.paused && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-muted">
                    Paused
                  </span>
                )}
                {r.mutedByMe && (
                  <BellOff
                    aria-label="Your alerts are off"
                    className="size-4 text-muted"
                  />
                )}
              </span>
              <span className="text-sm text-muted">
                {r.personName} · {describeSchedule(r.schedule)}
              </span>
              <span className="text-sm text-muted">
                {r.paused
                  ? "No alerts while paused"
                  : r.nextAt
                    ? `Next: ${whenText(r.nextAt)}`
                    : "Ended"}
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
