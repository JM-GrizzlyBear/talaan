import {
  ACCESS_LABELS,
  ACCESS_LEVELS,
  type AccessLevel,
  type FamilyMemberInfo,
  fullName,
  relationshipLabel,
} from "@talaan/shared";
import { useState } from "react";
import {
  useChangeMemberAccess,
  useRemoveMember,
} from "../../../application/family/useFamily";
import { errorMessage } from "../../format/errorMessage";
import { Badge } from "../ui/Badge";
import { ErrorAlert } from "../ui/ErrorAlert";
import { InlineConfirm } from "../ui/InlineConfirm";
import { linkButton } from "../ui/styles";

// Someone who can see my records: change what they can do, or remove them
export function MemberRow({ member }: { member: FamilyMemberInfo }) {
  const change = useChangeMemberAccess();
  const remove = useRemoveMember();
  const [confirming, setConfirming] = useState(false);
  const name = fullName(member);

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <strong className="flex flex-wrap items-center gap-2">
            {name} <Badge>{relationshipLabel(member.relationship)}</Badge>
          </strong>
          <span className="truncate text-sm text-muted">{member.email}</span>
        </span>
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">What {name} can do</span>
          <select
            value={member.access}
            disabled={change.isPending}
            onChange={(event) =>
              change.mutate({
                userId: member.userId,
                access: event.target.value as AccessLevel,
              })
            }
            className="h-10 cursor-pointer rounded-lg border border-edge bg-white px-2 font-semibold"
          >
            {ACCESS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {ACCESS_LABELS[level].name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {(change.isError || remove.isError) && (
        <ErrorAlert message={errorMessage(change.error ?? remove.error)} />
      )}
      {confirming ? (
        <InlineConfirm
          question={`Stop sharing your records with ${member.firstName}?`}
          confirmLabel="Yes, stop sharing"
          onConfirm={() => remove.mutate(member.userId)}
          onCancel={() => setConfirming(false)}
          pending={remove.isPending}
        />
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Remove ${name}`}
          className={`${linkButton} self-start`}
        >
          Remove
        </button>
      )}
    </li>
  );
}
