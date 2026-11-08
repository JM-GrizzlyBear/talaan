import {
  ACCESS_LABELS,
  describeAlert,
  describeSchedule,
  REMINDER_KIND_LABELS,
  type ReminderInfo,
} from "@talaan/shared";
import { Bell, BellOff, FileText, Pause, Pencil, Play } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  useReminder,
  useRemoveReminder,
  useSetMyAlerts,
  useSetPaused,
} from "../../../application/reminders/useReminders";
import { OccurrenceActions } from "../../components/reminders/OccurrenceActions";
import { ReminderKindIcon } from "../../components/reminders/ReminderKindIcon";
import { whenText } from "../../components/reminders/reminderTimes";
import { StateBadge } from "../../components/reminders/StateBadge";
import { BackLink } from "../../components/ui/BackLink";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { InlineConfirm } from "../../components/ui/InlineConfirm";
import { Loading } from "../../components/ui/Loading";
import { buttonSecondary, dangerLinkButton } from "../../components/ui/styles";
import { shortDateTime } from "../../format/dates";
import { errorMessage } from "../../format/errorMessage";

export function ReminderPage() {
  const { id = "" } = useParams();
  const reminder = useReminder(id);
  if (reminder.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (reminder.isError) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
        <ErrorAlert message={errorMessage(reminder.error)} />
        <Link to="/reminders" className="font-semibold text-brand underline">
          Back to reminders
        </Link>
      </main>
    );
  }
  return <ReminderView reminder={reminder.data} />;
}

function ReminderView({ reminder }: { reminder: ReminderInfo }) {
  const canChange = reminder.role === "owner" || reminder.role === "manage";
  const paused = useSetPaused();
  const mute = useSetMyAlerts();
  const remove = useRemoveReminder();
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();
  const owner = `owner=${reminder.ownerId}`;
  const now = new Date();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <BackLink to={`/reminders?${owner}`}>Back to reminders</BackLink>

      <header className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-brand">
          <ReminderKindIcon kind={reminder.kind} className="size-4" />
          {REMINDER_KIND_LABELS[reminder.kind]} · for {reminder.personName}
        </span>
        <h1 className="text-3xl font-bold break-words">{reminder.title}</h1>
        {reminder.dose && <p className="text-lg">{reminder.dose}</p>}
        {reminder.paused && (
          <p className="self-start rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-muted">
            Paused: no alerts until it's resumed
          </p>
        )}
        {reminder.role !== "owner" && (
          <p className="text-sm text-muted">
            {reminder.ownerName}'s reminder · You{" "}
            {ACCESS_LABELS[reminder.role].name.toLowerCase()}
          </p>
        )}
      </header>

      {canChange && (
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/reminders/${reminder.id}/edit`}
            className={buttonSecondary}
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() =>
              paused.mutate({ id: reminder.id, paused: !reminder.paused })
            }
            disabled={paused.isPending}
            className={buttonSecondary}
          >
            {reminder.paused ? (
              <Play aria-hidden="true" className="size-4" />
            ) : (
              <Pause aria-hidden="true" className="size-4" />
            )}
            {reminder.paused ? "Resume" : "Pause"}
          </button>
        </div>
      )}
      {paused.isError && <ErrorAlert message={errorMessage(paused.error)} />}

      <section className="flex flex-col gap-3 rounded-xl border border-edge bg-white p-4">
        <p className="font-semibold">{describeSchedule(reminder.schedule)}</p>
        <p className="text-sm text-muted">
          Alerts:{" "}
          {reminder.alerts.length === 0
            ? "none"
            : reminder.alerts.map(describeAlert).join(", ")}
          . Times are in Philippine time.
        </p>
        {reminder.note && (
          <p className="whitespace-pre-wrap">{reminder.note}</p>
        )}
        {reminder.recordId && (
          <p className="flex items-center gap-2 text-sm">
            <FileText aria-hidden="true" className="size-4 text-brand" />
            About{" "}
            <Link
              to={`/records/${reminder.recordId}`}
              className="font-semibold text-brand underline"
            >
              {reminder.recordTitle ?? "a record"}
            </Link>
          </p>
        )}
      </section>

      <section className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-white p-4">
        <span className="flex items-center gap-2">
          {reminder.mutedByMe ? (
            <BellOff aria-hidden="true" className="size-5 text-muted" />
          ) : (
            <Bell aria-hidden="true" className="size-5 text-brand" />
          )}
          <span>
            <span className="block font-semibold">
              {reminder.mutedByMe
                ? "Your alerts are off"
                : "You get its alerts"}
            </span>
            <span className="text-sm text-muted">
              Only for you. Others keep theirs.
            </span>
          </span>
        </span>
        <button
          type="button"
          onClick={() =>
            mute.mutate({ id: reminder.id, muted: !reminder.mutedByMe })
          }
          disabled={mute.isPending}
          className={buttonSecondary}
        >
          {reminder.mutedByMe ? "Turn on" : "Turn off"}
        </button>
      </section>

      <section aria-labelledby="next-heading" className="flex flex-col gap-2">
        <h2 id="next-heading" className="text-lg font-bold">
          Next times
        </h2>
        {reminder.upcoming.length === 0 ? (
          <p className="text-sm text-muted">No times left: it has ended.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-edge rounded-xl border border-edge bg-white">
            {reminder.upcoming.map((item) => (
              <li
                key={item.at}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex items-center gap-2 font-semibold">
                  {whenText(item.at, now)}
                  <StateBadge state={item.state} />
                </span>
                {canChange && (
                  <OccurrenceActions
                    reminderId={reminder.id}
                    at={item.at}
                    state={item.state}
                    snoozedUntil={item.snoozedUntil}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {reminder.recent.length > 0 && (
        <section
          aria-labelledby="recent-heading"
          className="flex flex-col gap-2"
        >
          <h2 id="recent-heading" className="text-lg font-bold">
            The last 7 days
          </h2>
          <ul className="flex flex-col divide-y divide-edge rounded-xl border border-edge bg-white">
            {reminder.recent.map((item) => (
              <li
                key={item.at}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex flex-col">
                  <span className="flex items-center gap-2 font-semibold">
                    {whenText(item.at, now)}
                    <StateBadge
                      state={
                        item.state === null || item.state === "snoozed"
                          ? "missed"
                          : item.state
                      }
                    />
                  </span>
                  {item.byName && item.state !== "snoozed" && (
                    <span className="text-sm text-muted">by {item.byName}</span>
                  )}
                </span>
                {canChange && (
                  <OccurrenceActions
                    reminderId={reminder.id}
                    at={item.at}
                    state={item.state}
                    snoozedUntil={item.snoozedUntil}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-muted">
        {reminder.createdByName ? `Added by ${reminder.createdByName}. ` : ""}
        Last changed
        {reminder.updatedByName ? ` by ${reminder.updatedByName}` : ""} on{" "}
        {shortDateTime(reminder.updatedAt)}.
      </p>

      {reminder.role === "owner" && (
        <div className="flex flex-col gap-2 border-t border-edge pt-4">
          {remove.isError && (
            <ErrorAlert message={errorMessage(remove.error)} />
          )}
          {confirming ? (
            <InlineConfirm
              question={`Remove “${reminder.title}”? Its alerts stop for everyone.`}
              confirmLabel="Remove"
              pending={remove.isPending}
              onConfirm={() =>
                remove.mutate(reminder.id, {
                  onSuccess: () =>
                    void navigate(`/reminders?${owner}`, { replace: true }),
                })
              }
              onCancel={() => setConfirming(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={`${dangerLinkButton} self-start`}
            >
              Remove this reminder
            </button>
          )}
        </div>
      )}
    </main>
  );
}
