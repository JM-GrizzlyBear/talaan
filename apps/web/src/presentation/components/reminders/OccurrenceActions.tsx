import type { OccurrenceState } from "@talaan/shared";
import { AlarmClock, Check, SkipForward, Undo2 } from "lucide-react";
import { useState } from "react";
import { useOccurrenceAction } from "../../../application/reminders/useReminders";
import { errorMessage } from "../../format/errorMessage";
import { timeText } from "./reminderTimes";

const MINUTE = 60 * 1000;
const small =
  "inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-lg border border-edge bg-white px-2.5 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60";

// Done, Skip, Snooze (10 minutes, 1 hour, tomorrow) or Undo for one time
export function OccurrenceActions({
  reminderId,
  at,
  state,
  snoozedUntil,
}: {
  reminderId: string;
  at: string;
  state: OccurrenceState | null;
  snoozedUntil: string | null;
}) {
  const act = useOccurrenceAction();
  const [snoozing, setSnoozing] = useState(false);
  const send = (action: "done" | "skip" | "clear") =>
    act.mutate({ id: reminderId, action: { at, action } });
  const snooze = (ms: number) => {
    const from = Math.max(Date.now(), new Date(at).getTime());
    act.mutate(
      {
        id: reminderId,
        action: {
          at,
          action: "snooze",
          until: new Date(
            (ms < 24 * 60 * MINUTE ? Date.now() : from) + ms,
          ).toISOString(),
        },
      },
      { onSettled: () => setSnoozing(false) },
    );
  };

  if (state === "done" || state === "skipped") {
    return (
      <button
        type="button"
        onClick={() => send("clear")}
        disabled={act.isPending}
        className={small}
      >
        <Undo2 aria-hidden="true" className="size-4" />
        Undo
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => send("done")}
          disabled={act.isPending}
          className={`${small} border-brand text-brand`}
        >
          <Check aria-hidden="true" className="size-4" />
          Done
        </button>
        <button
          type="button"
          onClick={() => send("skip")}
          disabled={act.isPending}
          className={small}
        >
          <SkipForward aria-hidden="true" className="size-4" />
          Skip
        </button>
        <button
          type="button"
          onClick={() => setSnoozing((s) => !s)}
          aria-expanded={snoozing}
          disabled={act.isPending}
          className={small}
        >
          <AlarmClock aria-hidden="true" className="size-4" />
          Snooze
        </button>
      </div>
      {snoozing && (
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Snooze for"
        >
          <button
            type="button"
            onClick={() => snooze(10 * MINUTE)}
            className={small}
          >
            10 minutes
          </button>
          <button
            type="button"
            onClick={() => snooze(60 * MINUTE)}
            className={small}
          >
            1 hour
          </button>
          <button
            type="button"
            onClick={() => snooze(24 * 60 * MINUTE)}
            className={small}
          >
            Tomorrow
          </button>
        </div>
      )}
      {state === "snoozed" && snoozedUntil && (
        <p className="text-xs text-muted">
          Snoozed until {timeText(snoozedUntil)}.{" "}
          <button
            type="button"
            onClick={() => send("clear")}
            className="cursor-pointer font-semibold text-brand underline"
          >
            Cancel snooze
          </button>
        </p>
      )}
      {act.isError && (
        <p className="text-xs font-medium text-danger">
          {errorMessage(act.error)}
        </p>
      )}
    </div>
  );
}
