import { ACCESS_LABELS, type InvitationPreview } from "@talaan/shared";
import { Link } from "react-router";
import { AuthCard } from "../../layout/AuthCard";
import { Notice } from "../../ui/Notice";
import { buttonPrimary, buttonSecondary } from "../../ui/styles";

// Just accepted
export function InvitationAccepted({ invite }: { invite: InvitationPreview }) {
  return (
    <AuthCard title="You're in">
      <div className="flex flex-col gap-4">
        <Notice>
          You can now see {invite.inviterName}'s records (
          {ACCESS_LABELS[invite.access].name.toLowerCase()}).
        </Notice>
        <Link to="/family" className={buttonPrimary}>
          Go to Family
        </Link>
      </div>
    </AuthCard>
  );
}

// Just declined
export function InvitationDeclined({ invite }: { invite: InvitationPreview }) {
  return (
    <AuthCard title="Invitation declined">
      <p className="text-muted">
        Nothing was shared. If you change your mind, ask {invite.inviterName} to
        send it again.
      </p>
    </AuthCard>
  );
}

// Expired, already used, or cancelled
export function InvitationClosed({
  invite,
  signedIn,
}: {
  invite: InvitationPreview;
  signedIn: boolean;
}) {
  const inviter = invite.inviterName;
  const closed: Record<string, string> = {
    expired: `This invitation from ${inviter} has expired. Ask them to send it again.`,
    accepted: invite.forThisAccount
      ? `You already accepted. You can see ${inviter}'s records on the Family page.`
      : "This invitation was already accepted.",
    declined: `This invitation from ${inviter} was declined.`,
    cancelled: `${inviter} cancelled this invitation.`,
  };
  return (
    <AuthCard title="Invitation">
      <div className="flex flex-col gap-4">
        <Notice>{closed[invite.status]}</Notice>
        {signedIn && (
          <Link to="/family" className={buttonSecondary}>
            Go to Family
          </Link>
        )}
      </div>
    </AuthCard>
  );
}
