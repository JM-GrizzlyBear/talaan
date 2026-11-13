import {
  ACCESS_FOR_INVITEE,
  ACCESS_LABELS,
  relationshipLabel,
  type InvitationPreview,
} from "@talaan/shared";
import { MailOpen } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { shortDate } from "@talaan/client";
import { errorMessage } from "../../../format/errorMessage";
import { AuthCard } from "../../layout/AuthCard";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { InlineConfirm } from "../../ui/InlineConfirm";
import { buttonPrimary, buttonSecondary, linkButton } from "../../ui/styles";

// A waiting invitation: who, as what, and what accepting means. Signed in
// with the invited email: Accept. Not signed in: sign in or sign up first.
// Signed in with another email: sign out. Anyone can decline.
export function PendingInvitation({
  invite,
  comeBack,
  onAccept,
  accepting,
  onDecline,
  declining,
  onSignOut,
  signingOut,
  error,
}: {
  invite: InvitationPreview;
  // Sign-in and sign-up return here afterwards
  comeBack: { from: string };
  onAccept: () => void;
  accepting: boolean;
  onDecline: () => void;
  declining: boolean;
  onSignOut: () => void;
  signingOut: boolean;
  error: unknown;
}) {
  const [confirmDecline, setConfirmDecline] = useState(false);
  const inviter = invite.inviterName;
  const access = ACCESS_LABELS[invite.access];

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
        {error != null && <ErrorAlert message={errorMessage(error)} />}

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
            onClick={onAccept}
            disabled={accepting}
            className={buttonPrimary}
          >
            {accepting ? "Accepting…" : "Accept"}
          </button>
        )}
        {invite.forThisAccount === false && (
          <>
            <ErrorAlert
              message={`You're signed in with a different email. This invitation is for ${invite.email}: sign out, then sign in with that email.`}
            />
            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut}
              className={buttonSecondary}
            >
              Sign out
            </button>
          </>
        )}

        {confirmDecline ? (
          <InlineConfirm
            question={`Decline ${inviter}'s invitation?`}
            confirmLabel="Yes, decline"
            cancelLabel="Go back"
            onConfirm={onDecline}
            onCancel={() => setConfirmDecline(false)}
            pending={declining}
          />
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDecline(true)}
            className={`${linkButton} self-start`}
          >
            Decline
          </button>
        )}
      </div>
    </AuthCard>
  );
}
