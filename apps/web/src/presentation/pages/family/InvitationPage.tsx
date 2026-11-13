import { useLocation, useParams } from "react-router";
import {
  useLogOut,
  useSession,
  useAcceptInvitation,
  useDeclineInvitation,
  useInvitationPreview,
  ApiError,
} from "@talaan/client";
import {
  InvitationAccepted,
  InvitationClosed,
  InvitationDeclined,
} from "../../components/family/invitation/InvitationOutcome";
import { PendingInvitation } from "../../components/family/invitation/PendingInvitation";
import { AuthCard } from "../../components/layout/AuthCard";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { errorMessage } from "../../format/errorMessage";
import { LockScreen } from "../auth/LockScreen";

// The link in a family invitation email. Open to everyone: the invited person
// may not have an account yet, and can decline without one.
export function InvitationPage() {
  const { token = "" } = useParams();
  const session = useSession();

  if (session.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (session.data?.locked) return <LockScreen user={session.data.user} />;
  return <Invitation token={token} viewerId={session.data?.user.id ?? null} />;
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
  // Sign in or sign up, then come back here
  const comeBack = { from: location.pathname };

  if (preview.isPending)
    return <Loading className="p-8 text-center text-muted" />;
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
  if (accept.isSuccess) return <InvitationAccepted invite={invite} />;
  if (decline.isSuccess) return <InvitationDeclined invite={invite} />;
  if (invite.status !== "pending") {
    return <InvitationClosed invite={invite} signedIn={viewerId !== null} />;
  }
  return (
    <PendingInvitation
      invite={invite}
      comeBack={comeBack}
      onAccept={() => accept.mutate(token)}
      accepting={accept.isPending}
      onDecline={() => decline.mutate(token)}
      declining={decline.isPending}
      onSignOut={() => logOut.mutate()}
      signingOut={logOut.isPending}
      error={accept.error ?? decline.error}
    />
  );
}
