import {
  ACCESS_LABELS,
  fullName,
  relationshipLabel,
  type SharedWithMeInfo,
} from "@talaan/shared";
import { Eye } from "lucide-react";
import { useState } from "react";
import { useLeaveShared } from "@talaan/client";
import { errorMessage } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { InlineConfirm } from "../ui/InlineConfirm";
import { SectionHeading } from "../ui/SectionHeading";
import { linkButton, listCard } from "../ui/styles";

// Records other people shared with me, and stopping
export function SharedWithMeSection({
  shared,
}: {
  shared: SharedWithMeInfo[];
}) {
  return (
    <section aria-labelledby="shared-heading" className="flex flex-col gap-3">
      <SectionHeading id="shared-heading" icon={<Eye className="size-5" />}>
        Records shared with me
      </SectionHeading>
      {shared.length === 0 ? (
        <p className="text-sm text-muted">
          Nobody has shared their records with you yet. When someone invites
          you, the email has a link to accept.
        </p>
      ) : (
        <ul className={listCard}>
          {shared.map((owner) => (
            <SharedRow key={owner.ownerId} owner={owner} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function SharedRow({ owner }: { owner: SharedWithMeInfo }) {
  const leave = useLeaveShared();
  const [confirming, setConfirming] = useState(false);
  const name = fullName(owner);

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <span className="flex min-w-0 flex-col">
        <strong>{name}</strong>
        <span className="truncate text-sm text-muted">{owner.email}</span>
        <span className="text-sm">
          You're their {relationshipLabel(owner.relationship)} ·{" "}
          <strong>{ACCESS_LABELS[owner.access].name}</strong>
        </span>
        {owner.profiles.length > 0 && (
          <span className="text-sm text-muted">
            Also keeps:{" "}
            {owner.profiles
              .map(
                (p) => `${p.firstName} (${relationshipLabel(p.relationship)})`,
              )
              .join(", ")}
          </span>
        )}
      </span>
      {leave.isError && <ErrorAlert message={errorMessage(leave.error)} />}
      {confirming ? (
        <InlineConfirm
          question={`Stop seeing ${owner.firstName}'s records?`}
          confirmLabel="Yes, stop"
          onConfirm={() => leave.mutate(owner.ownerId)}
          onCancel={() => setConfirming(false)}
          pending={leave.isPending}
        />
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Stop seeing ${name}'s records`}
          className={`${linkButton} self-start`}
        >
          Stop seeing
        </button>
      )}
    </li>
  );
}
