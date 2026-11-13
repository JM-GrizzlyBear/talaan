import { ACCESS_LABELS, type RecordAccountInfo } from "@talaan/shared";
import { Plus, Settings } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  useRecordAccounts,
  useAgenda,
  useReminders,
  dayKey,
} from "@talaan/client";
import { AgendaList } from "../../components/reminders/AgendaList";
import { ReminderList } from "../../components/reminders/ReminderList";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { SelectField } from "../../components/ui/SelectField";
import { buttonPrimary, buttonSecondary } from "../../components/ui/styles";
import { errorMessage } from "../../format/errorMessage";

const DAY = 24 * 60 * 60 * 1000;

const accountLabel = (account: RecordAccountInfo) =>
  account.role === "owner"
    ? "My reminders"
    : `${account.ownerName}'s reminders (${ACCESS_LABELS[account.role].name})`;

// /reminders?owner=…&view=all
export function RemindersPage() {
  const [params, setParams] = useSearchParams();
  const accounts = useRecordAccounts();
  const list = accounts.data ?? [];
  const account =
    list.find((a) => a.ownerId === params.get("owner")) ?? list[0] ?? null;
  const view = params.get("view") === "all" ? "all" : "coming";
  const canChange = account?.role === "owner" || account?.role === "manage";
  const owner = account ? `?owner=${account.ownerId}` : "";

  const show = (next: { owner?: string; view?: string }) =>
    setParams(
      {
        ...(account ? { owner: next.owner ?? account.ownerId } : {}),
        ...((next.view ?? view) === "all" ? { view: "all" } : {}),
      },
      { replace: true },
    );

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Reminders</h1>
          <p className="text-muted">
            Checkups, lab tests, medicine and refills, with alerts by email and
            browser notification.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/settings/alerts" className={buttonSecondary}>
            <Settings aria-hidden="true" className="size-4" />
            My alerts
          </Link>
          {canChange && (
            <Link to={`/reminders/new${owner}`} className={buttonPrimary}>
              <Plus aria-hidden="true" className="size-4" />
              Add reminder
            </Link>
          )}
        </div>
      </div>

      {accounts.isError && (
        <ErrorAlert message={errorMessage(accounts.error)} />
      )}
      {list.length > 1 && account && (
        <div className="sm:max-w-xs">
          <SelectField
            label="Whose reminders"
            value={account.ownerId}
            onChange={(value) => show({ owner: value })}
            options={list.map((a) => ({
              value: a.ownerId,
              label: accountLabel(a),
            }))}
          />
        </div>
      )}

      <div role="tablist" className="flex gap-2 border-b border-edge">
        {(
          [
            ["coming", "Coming up"],
            ["all", "All reminders"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => show({ view: value })}
            className={`-mb-px cursor-pointer border-b-2 px-3 py-2 font-semibold ${
              view === value
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {accounts.isPending && <Loading />}
      {account &&
        (view === "coming" ? (
          <ComingUp ownerId={account.ownerId} canChange={canChange} />
        ) : (
          <AllReminders ownerId={account.ownerId} canChange={canChange} />
        ))}
    </main>
  );
}

// Missed times from the last 2 days, then the next week (more on request)
function ComingUp({
  ownerId,
  canChange,
}: {
  ownerId: string;
  canChange: boolean;
}) {
  const [weeks, setWeeks] = useState(1);
  // Fixed for this visit (the agenda refreshes each minute on its own)
  const [start] = useState(() => Date.now());
  const from = useMemo(() => new Date(start - 2 * DAY), [start]);
  const to = useMemo(() => new Date(start + weeks * 7 * DAY), [start, weeks]);
  const agenda = useAgenda(ownerId, from, to);
  if (agenda.isPending) return <Loading />;
  if (agenda.isError)
    return <ErrorAlert message={errorMessage(agenda.error)} />;
  // "Now" as of the last refresh (each minute)
  const now = new Date(agenda.dataUpdatedAt || start);
  // Earlier days' times already done or skipped aren't news; today's stay
  // (with Undo)
  const today = dayKey(now);
  const items = agenda.data.items.filter(
    (i) => dayKey(i.at) >= today || i.state === null || i.state === "snoozed",
  );
  const more =
    weeks < 8 ? (
      <button
        type="button"
        onClick={() => setWeeks((w) => w + 1)}
        className={`${buttonSecondary} self-start`}
      >
        Show the next week
      </button>
    ) : null;
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Empty
          ownerId={ownerId}
          canChange={canChange}
          text={
            weeks === 1
              ? "Nothing in the next 7 days."
              : `Nothing in the next ${weeks} weeks.`
          }
        />
        {more}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <AgendaList items={items} canChange={canChange} now={now} />
      {more}
    </div>
  );
}

function AllReminders({
  ownerId,
  canChange,
}: {
  ownerId: string;
  canChange: boolean;
}) {
  const reminders = useReminders(ownerId);
  if (reminders.isPending) return <Loading />;
  if (reminders.isError)
    return <ErrorAlert message={errorMessage(reminders.error)} />;
  if (reminders.data.reminders.length === 0) {
    return (
      <Empty ownerId={ownerId} canChange={canChange} text="No reminders yet." />
    );
  }
  return <ReminderList reminders={reminders.data.reminders} />;
}

function Empty({
  ownerId,
  canChange,
  text,
}: {
  ownerId: string;
  canChange: boolean;
  text: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-edge bg-white p-6">
      <p className="font-semibold">{text}</p>
      <p className="text-sm text-muted">
        Add a follow-up checkup, a lab test to repeat, medicine to take every
        day, or when to renew the HMO.
      </p>
      {canChange && (
        <Link to={`/reminders/new?owner=${ownerId}`} className={buttonPrimary}>
          Add a reminder
        </Link>
      )}
    </div>
  );
}
