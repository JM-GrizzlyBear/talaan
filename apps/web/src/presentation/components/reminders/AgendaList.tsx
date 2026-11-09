import type { AgendaInfo } from "@talaan/shared";
import { Link } from "react-router";
import { isMissed } from "./agendaItems";
import { OccurrenceActions } from "./OccurrenceActions";
import { ReminderKindIcon } from "./ReminderKindIcon";
import { dayHeading, dayKey, timeText } from "./reminderTimes";
import { StateBadge } from "./StateBadge";

type Item = AgendaInfo["items"][number];

// What's coming, grouped by day: Missed first, then Today, Tomorrow…
export function AgendaList({
  items,
  canChange,
  now,
}: {
  items: Item[];
  canChange: boolean;
  now: Date;
}) {
  const missed = items.filter((i) => isMissed(i, now));
  const ahead = items.filter((i) => new Date(i.at) >= now || !isMissed(i, now));
  const groups = new Map<string, { heading: string; items: Item[] }>();
  if (missed.length > 0)
    groups.set("missed", { heading: "Missed", items: missed });
  for (const item of ahead) {
    // Past times already done stay under their own day
    const key = dayKey(item.at);
    const group = groups.get(key) ?? {
      heading: dayHeading(item.at, now),
      items: [],
    };
    group.items.push(item);
    groups.set(key, group);
  }

  return (
    <div className="flex flex-col gap-6">
      {[...groups.entries()].map(([key, group]) => (
        <section
          key={key}
          aria-labelledby={`day-${key}`}
          className="flex flex-col gap-2"
        >
          <h2
            id={`day-${key}`}
            className={`text-sm font-bold tracking-wide uppercase ${key === "missed" ? "text-danger" : "text-muted"}`}
          >
            {group.heading}
          </h2>
          <ul className="flex flex-col divide-y divide-edge rounded-xl border border-edge bg-white">
            {group.items.map((item) => (
              <li
                key={`${item.reminderId}|${item.at}`}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  to={`/reminders/${item.reminderId}`}
                  className="flex min-w-0 items-start gap-3 hover:underline"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                    <ReminderKindIcon
                      kind={item.kind}
                      className="size-5 text-brand"
                    />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {key === "missed" ? `${dayHeading(item.at, now)}, ` : ""}
                      {timeText(item.at)} · {item.title}
                      <StateBadge
                        state={key === "missed" ? "missed" : item.state}
                      />
                    </span>
                    <span className="text-sm text-muted">
                      {item.personName}
                      {item.dose ? ` · ${item.dose}` : ""}
                      {item.byName && item.state !== "snoozed"
                        ? ` · ${item.state === "done" ? "Done" : "Skipped"} by ${item.byName}`
                        : ""}
                    </span>
                  </span>
                </Link>
                {canChange && (
                  <div className="sm:shrink-0">
                    <OccurrenceActions
                      reminderId={item.reminderId}
                      at={item.at}
                      state={item.state}
                      snoozedUntil={item.snoozedUntil}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
