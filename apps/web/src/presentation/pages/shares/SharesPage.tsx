import { Link2, Plus } from "lucide-react";
import { Link } from "react-router";
import { useRecordAccounts } from "../../../application/records/useRecords";
import { useShares } from "../../../application/shares/useShares";
import { PersonPicker } from "../../components/people/PersonPicker";
import { usePersonParams } from "../../components/medical/usePersonParams";
import { openedText, sharedThings } from "../../components/shares/shareText";
import { ShareStatusBadge } from "../../components/shares/ShareStatusBadge";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { buttonPrimary, listCard } from "../../components/ui/styles";
import { shortDateTime } from "../../format/dates";
import { errorMessage } from "../../format/errorMessage";

// /shares?owner=…&person=…: the links made for doctors, open ones first
export function SharesPage() {
  const accounts = useRecordAccounts();
  // Only accounts you may share from
  const mine = (accounts.data ?? []).filter(
    (a) => a.role === "owner" || a.role === "manage",
  );
  const { account, person, query, setParams } = usePersonParams(mine);
  const links = useShares(account?.ownerId);
  const forPerson = (links.data ?? []).filter(
    (l) => (l.profileId ?? "self") === person?.profileId,
  );
  const open = forPerson.filter(
    (l) => l.status === "open" || l.status === "used",
  );
  const ended = forPerson.filter(
    (l) => l.status === "expired" || l.status === "stopped",
  );

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Share with a doctor</h1>
          <p className="text-muted">
            A link (and QR) that opens only what you choose, without signing in,
            until it ends or you stop it.
          </p>
        </div>
        {person && (
          <Link to={`/shares/new?${query}`} className={buttonPrimary}>
            <Plus aria-hidden="true" className="size-5" />
            New link
          </Link>
        )}
      </div>

      {accounts.isPending && <Loading />}
      {accounts.isError && (
        <ErrorAlert message={errorMessage(accounts.error)} />
      )}
      {accounts.data && mine.length === 0 && (
        <p className="text-muted">
          Only the owner of records, or family who can manage them, can share
          them.
        </p>
      )}
      {account && person && (
        <div className="sm:max-w-sm">
          <PersonPicker
            label="Whose records"
            accounts={mine}
            ownerId={account.ownerId}
            profileId={person.profileId}
            onChange={(owner, profile) =>
              setParams({ owner, person: profile }, { replace: true })
            }
          />
        </div>
      )}

      {links.isPending && account && <Loading />}
      {links.isError && <ErrorAlert message={errorMessage(links.error)} />}
      {links.data && forPerson.length === 0 && (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-edge bg-white p-6">
          <Link2 aria-hidden="true" className="size-8 text-brand" />
          <p className="font-semibold">No links yet.</p>
          <p className="text-sm text-muted">
            Before a check-up, make a link with the records the doctor needs.
            You'll be told when it's opened.
          </p>
        </div>
      )}
      {open.length > 0 && <LinkList title="Open" links={open} />}
      {ended.length > 0 && <LinkList title="Ended" links={ended} />}
    </main>
  );
}

function LinkList({
  title,
  links,
}: {
  title: string;
  links: NonNullable<ReturnType<typeof useShares>["data"]>;
}) {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className={listCard}>
        {links.map((link) => (
          <li key={link.id}>
            <Link
              to={`/shares/${link.id}`}
              className="flex flex-col gap-1 px-4 py-3 hover:bg-gray-50"
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <strong className="break-words">{link.recipient}</strong>
                <ShareStatusBadge status={link.status} />
              </span>
              <span className="text-sm">{sharedThings(link)}</span>
              <span className="text-xs text-muted">
                {link.status === "stopped"
                  ? `Stopped ${shortDateTime(link.stoppedAt ?? link.expiresAt)}`
                  : `${link.status === "expired" ? "Ended" : "Until"} ${shortDateTime(link.expiresAt)}`}
                {" · "}
                {openedText(link)}
                {link.hasPin && " · PIN"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
