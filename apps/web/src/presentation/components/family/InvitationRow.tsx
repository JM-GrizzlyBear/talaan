import {
  ACCESS_LABELS,
  relationshipLabel,
  type SentInvitationInfo,
} from "@talaan/shared";
import {
  useCancelInvitation,
  useResendInvitation,
  shortDate,
} from "@talaan/client";
import { errorMessage } from "../../format/errorMessage";
import { Badge } from "../ui/Badge";
import { ErrorAlert } from "../ui/ErrorAlert";
import { Notice } from "../ui/Notice";
import { linkButton } from "../ui/styles";

// An invitation still waiting, expired or declined
const STATUS_TEXT = {
  pending: (i: SentInvitationInfo) =>
    `Waiting · until ${shortDate(i.expiresAt)}`,
  expired: () => "Expired",
  declined: () => "Declined",
};

export function InvitationRow({
  invitation,
}: {
  invitation: SentInvitationInfo;
}) {
  const resend = useResendInvitation();
  const cancel = useCancelInvitation();
  const waiting = invitation.status === "pending";

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <strong className="flex flex-wrap items-center gap-2 break-all">
            {invitation.email}{" "}
            <Badge>{relationshipLabel(invitation.relationship)}</Badge>
          </strong>
          <span className="text-sm text-muted">
            {ACCESS_LABELS[invitation.access].name} ·{" "}
            <span className={waiting ? "" : "font-semibold text-danger"}>
              {STATUS_TEXT[invitation.status](invitation)}
            </span>
          </span>
        </span>
        <span className="flex gap-4">
          <button
            type="button"
            onClick={() => resend.mutate(invitation.id)}
            disabled={resend.isPending}
            className={linkButton}
          >
            {resend.isPending ? "Sending…" : "Send again"}
          </button>
          <button
            type="button"
            onClick={() => cancel.mutate(invitation.id)}
            disabled={cancel.isPending}
            aria-label={`${waiting ? "Cancel" : "Clear"} the invitation to ${invitation.email}`}
            className={linkButton}
          >
            {waiting ? "Cancel" : "Clear"}
          </button>
        </span>
      </div>
      {resend.isSuccess && <Notice>Sent again with a new link.</Notice>}
      {(resend.isError || cancel.isError) && (
        <ErrorAlert message={errorMessage(resend.error ?? cancel.error)} />
      )}
    </li>
  );
}
