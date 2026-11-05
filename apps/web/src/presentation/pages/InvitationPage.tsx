import {
  ACCESS_FOR_INVITEE,
  ACCESS_LABELS,
  relationshipLabel,
} from "@talaan/shared";
import { MailOpen } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useLogOut, useSession } from "../../application/auth/useAuth";
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useInvitationPreview,
} from "../../application/family/useFamily";
import { ApiError } from "../../infrastructure/api/http";
import { AuthCard } from "../components/layout/AuthCard";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Notice } from "../components/ui/Notice";
import { buttonPrimary, buttonSecondary } from "../components/ui/styles";
import { shortDate } from "../format/dates";
import { errorMessage } from "../format/errorMessage";
import { LockScreen } from "./LockScreen";

// The link in a family invitation email. Open to everyone: the invited person
// may not have an account yet, and can decline without one.
export function InvitationPage() {
  const { token = "" } = useParams();
  const session = useSession();

  if (session.isPending) return <Loading />;
  if (session.data?.locked) return <LockScreen user={session.data.user} />;
  return <Invitation token={token} viewerId={session.data?.user.id ?? null} />;
}

function Loading() {
  return (
    <p role="status" className="p-8 text-center text-muted">
      Loading…
    </p>
  );
}

function Invitation({
  token,
  viewerId,
}: {
  token: string;
  viewerId: string | null;
}) {
  const location = useLocation();
  const preview = useInvitationPreview(token, viewerId);
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const logOut = useLogOut();
  const [confirmDecline, setConfirmDecline] = useState(false);
  // Sign in or sign up, then come back here
  const comeBack = { from: location.pathname };

  if (preview.isPending) return <Loading />;
  if (preview.isError) {
    const unknown =
      preview.error instanceof ApiError &&
      (preview.error.status === 404 || preview.error.status === 400);
    return (
      <AuthCard title="Invitation">
        <ErrorAlert
          message={
            unknown
              ? "That invitation link doesn't work. It may be incomplete, or a newer invitation replaced it. Ask the person who invited you to send it again."
              : errorMessage(preview.error)
          }
        />
      </AuthCard>
    );
  }

  const invite = preview.data;
  const inviter = invite.inviterName;
  const access = ACCESS_LABELS[invite.access];

  if (accept.isSuccess) {
    return (
      <AuthCard title="You're in">
        <div className="flex flex-col gap-4">
          <Notice>
            You can now see {inviter}'s records ({access.name.toLowerCase()}).
          </Notice>
          <Link to="/family" className={buttonPrimary}>
            Go to Family
          </Link>
        </div>
      </AuthCard>
    );
  }
  if (decline.isSuccess) {
    return (
      <AuthCard title="Invitation declined">
        <p className="text-muted">
          Nothing was shared. If you change your mind, ask {inviter} to send it
          again.
        </p>
      </AuthCard>
    );
  }

  const closed: Record<string, string> = {
    expired: `This invitation from ${inviter} has expired. Ask them to send it again.`,
    accepted: invite.forThisAccount
      ? `You already accepted. You can see ${inviter}'s records on the Family page.`
      : "This invitation was already accepted.",
    declined: `This invitation from ${inviter} was declined.`,
    cancelled: `${inviter} cancelled this invitation.`,
  };
  if (invite.status !== "pending") {
    return (
      <AuthCard title="Invitation">
        <div className="flex flex-col gap-4">
          <Notice>{closed[invite.status]}</Notice>
          {viewerId && (
            <Link to="/family" className={buttonSecondary}>
              Go to Family
            </Link>
          )}
        </div>
      </AuthCard>
    );
  }

  const error = accept.error ?? decline.error;
  return (
    <AuthCard title="You're invited">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <MailOpen
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 text-brand"
          />
          <p>
            <strong>{inviter}</strong> wants to share their health records with
            you, as their{" "}
            <strong>{relationshipLabel(invite.relationship)}</strong>.
          </p>
        </div>
        <p className="rounded-lg bg-page px-3.5 py-2.5 text-sm">
          <strong>{access.name}.</strong>{" "}
          <span className="text-muted">
            {ACCESS_FOR_INVITEE[invite.access]}
          </span>
        </p>
        <p className="text-sm text-muted">
          For {invite.email} · until {shortDate(invite.expiresAt)}
        </p>
        {error && <ErrorAlert message={errorMessage(error)} />}

        {invite.forThisAccount === null && (
          <>
            <Link to="/login" state={comeBack} className={buttonPrimary}>
              Sign in to accept
            </Link>
            <Link to="/register" state={comeBack} className={buttonSecondary}>
              Create a free account
            </Link>
            <p className="text-xs text-muted">
              Use the email address this invitation was sent to.
            </p>
          </>
        )}
        {invite.forThisAccount === true && (
          <button
            type="button"
            onClick={() => accept.mutate(token)}
            disabled={accept.isPending}
            className={buttonPrimary}
          >
            {accept.isPending ? "Accepting…" : "Accept"}
          </button>
        )}
        {invite.forThisAccount === false && (
          <>
            <ErrorAlert
              message={`You're signed in with a different email. This invitation is for ${invite.email}: sign out, then sign in with that email.`}
            />
            <button
              type="button"
              onClick={() => logOut.mutate()}
              disabled={logOut.isPending}
              className={buttonSecondary}
            >
              Sign out
            </button>
          </>
        )}

        {confirmDecline ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Decline {inviter}'s invitation?</span>
            <button
              type="button"
              onClick={() => decline.mutate(token)}
              disabled={decline.isPending}
              className="cursor-pointer font-semibold text-danger underline"
            >
              Yes, decline
            </button>
            <button
              type="button"
              onClick={() => setConfirmDecline(false)}
              className="cursor-pointer font-semibold text-brand underline"
            >
              Go back
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDecline(true)}
            className="cursor-pointer self-start text-sm font-semibold text-brand underline"
          >
            Decline
          </button>
        )}
      </div>
    </AuthCard>
  );
}
