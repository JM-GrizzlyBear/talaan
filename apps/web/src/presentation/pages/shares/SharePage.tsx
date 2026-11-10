import { RECORD_TYPE_LABELS } from "@talaan/shared";
import { CalendarClock, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  useRemoveShare,
  useShare,
  useStopShare,
} from "../../../application/shares/useShares";
import { shareUrl } from "../../../infrastructure/api/sharesApi";
import { LinkBox } from "../../components/shares/LinkBox";
import { ShareSettingsForm } from "../../components/shares/ShareSettingsForm";
import { ShareStatusBadge } from "../../components/shares/ShareStatusBadge";
import { openedText, sharedThings } from "../../components/shares/shareText";
import { ViewsList } from "../../components/shares/ViewsList";
import { BackLink } from "../../components/ui/BackLink";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { InlineConfirm } from "../../components/ui/InlineConfirm";
import { Loading } from "../../components/ui/Loading";
import { Notice } from "../../components/ui/Notice";
import {
  buttonDanger,
  buttonSecondary,
  dangerLinkButton,
} from "../../components/ui/styles";
import { shortDate, shortDateTime } from "../../format/dates";
import { errorMessage } from "../../format/errorMessage";

// One link: give it, see who opened it, change it, stop it
export function SharePage() {
  const { id = "" } = useParams();
  const link = useShare(id);
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as { pin?: string; made?: boolean };
  // Shown once: not kept in the page's history, so it's gone after a reload
  const [pin, setPin] = useState(state.pin || undefined);
  const [made] = useState(Boolean(state.made));
  useEffect(() => {
    if (state.pin || state.made) {
      void navigate(location.pathname, { replace: true, state: null });
    }
  }, [state.pin, state.made, navigate, location.pathname]);
  const [changing, setChanging] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [removing, setRemoving] = useState(false);
  const stop = useStopShare(id);
  const remove = useRemoveShare();

  if (link.isPending) return <Loading className="p-8 text-center text-muted" />;
  if (link.isError) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
        <ErrorAlert message={errorMessage(link.error)} />
        <Link to="/shares" className="font-semibold text-brand underline">
          Back to links
        </Link>
      </main>
    );
  }
  const l = link.data;
  const back = `/shares?${new URLSearchParams({ owner: l.ownerId, person: l.profileId ?? "self" })}`;
  const live = l.status === "open" || l.status === "used";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <BackLink to={back}>Links for doctors</BackLink>
      <header className="flex flex-col gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold break-words">{l.recipient}</h1>
          <ShareStatusBadge status={l.status} />
        </span>
        <p className="text-muted">
          {l.personName}'s records · made
          {l.createdByName ? ` by ${l.createdByName}` : ""}{" "}
          {shortDateTime(l.createdAt)}
        </p>
      </header>

      {made && live && (
        <Notice>
          The link is ready. Give it to {l.recipient}
          {pin ? ", and tell them the PIN" : ""}.
        </Notice>
      )}

      {live ? (
        <LinkBox url={shareUrl(l.token)} recipient={l.recipient} pin={pin} />
      ) : (
        <p className="rounded-lg bg-gray-100 px-3 py-2.5 text-sm">
          {l.status === "stopped"
            ? `Stopped${l.stoppedByName ? ` by ${l.stoppedByName}` : ""} ${shortDateTime(l.stoppedAt ?? l.expiresAt)}. The link doesn't open anymore.`
            : `Ended ${shortDateTime(l.expiresAt)}. The link doesn't open anymore.`}
        </p>
      )}

      <dl className="grid gap-4 rounded-xl border border-edge bg-white p-4 sm:grid-cols-2">
        <div className="flex flex-col">
          <dt className="text-sm text-muted">Shares</dt>
          <dd className="font-medium">{sharedThings(l)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="flex items-center gap-1 text-sm text-muted">
            <CalendarClock aria-hidden="true" className="size-4" />
            {live ? "Works until" : "Ended"}
          </dt>
          <dd className="font-medium">{shortDateTime(l.expiresAt)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="flex items-center gap-1 text-sm text-muted">
            <Eye aria-hidden="true" className="size-4" />
            Opened
          </dt>
          <dd className="font-medium">{openedText(l)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-sm text-muted">PIN</dt>
          <dd className="font-medium">{l.hasPin ? "Yes" : "No"}</dd>
        </div>
        {l.note && (
          <div className="flex flex-col sm:col-span-2">
            <dt className="text-sm text-muted">Note for them</dt>
            <dd className="whitespace-pre-line">{l.note}</dd>
          </div>
        )}
        {l.records.length > 0 && (
          <div className="flex flex-col sm:col-span-2">
            <dt className="text-sm text-muted">Records</dt>
            <dd>
              <ul className="flex flex-col gap-0.5">
                {l.records.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/records/${r.id}`}
                      className="font-medium text-brand underline-offset-2 hover:underline"
                    >
                      {r.title}
                    </Link>{" "}
                    <span className="text-sm text-muted">
                      {RECORD_TYPE_LABELS[r.type]} · {shortDate(r.recordDate)}
                    </span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      {live && (
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/s/${l.token}`}
            target="_blank"
            rel="noreferrer"
            className={buttonSecondary}
          >
            See what they see
          </a>
          {!changing && (
            <button
              type="button"
              onClick={() => setChanging(true)}
              className={buttonSecondary}
            >
              Change time, devices or PIN
            </button>
          )}
        </div>
      )}
      {live && changing && (
        <ShareSettingsForm
          link={l}
          onDone={(newPin) => {
            setChanging(false);
            if (newPin) setPin(newPin);
          }}
        />
      )}

      <section aria-labelledby="views-heading" className="flex flex-col gap-2">
        <h2 id="views-heading" className="text-lg font-bold">
          Who opened it
        </h2>
        <p className="text-sm text-muted">
          Each phone or computer that opened it. You're told by email and
          notification (at most every half hour), as set in{" "}
          <Link to="/settings/alerts" className="text-brand underline">
            your alert settings
          </Link>
          . Opening it yourself while signed in isn't counted.
        </p>
        <ViewsList views={l.views} />
      </section>

      {stop.isError && <ErrorAlert message={errorMessage(stop.error)} />}
      {remove.isError && <ErrorAlert message={errorMessage(remove.error)} />}
      {live ? (
        stopping ? (
          <InlineConfirm
            question={`Stop the link? ${l.recipient} won't be able to open it again.`}
            confirmLabel="Yes, stop it"
            pending={stop.isPending}
            onConfirm={() =>
              stop.mutate(undefined, { onSettled: () => setStopping(false) })
            }
            onCancel={() => setStopping(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setStopping(true)}
            className={`${buttonDanger} self-start`}
          >
            Stop sharing now
          </button>
        )
      ) : removing ? (
        <InlineConfirm
          question="Take this link off the list? Its history stays in Activity."
          confirmLabel="Yes, take it off"
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(l.id, { onSuccess: () => void navigate(back) })
          }
          onCancel={() => setRemoving(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setRemoving(true)}
          className={`${dangerLinkButton} self-start`}
        >
          Take off the list
        </button>
      )}
    </main>
  );
}
