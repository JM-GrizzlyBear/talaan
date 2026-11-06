import {
  type FamilyProfileInfo,
  fullName,
  relationshipLabel,
} from "@talaan/shared";
import { useState } from "react";
import { useRemoveProfile } from "../../../application/family/useFamily";
import { ageFrom } from "../../format/age";
import { shortDate } from "../../format/dates";
import { errorMessage } from "../../format/errorMessage";
import { Badge } from "../ui/Badge";
import { ErrorAlert } from "../ui/ErrorAlert";
import { InlineConfirm } from "../ui/InlineConfirm";
import { linkButton } from "../ui/styles";
import { ProfileForm } from "./ProfileForm";

// One profile: name, who they are, age; edit or remove
export function ProfileRow({ profile }: { profile: FamilyProfileInfo }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const remove = useRemoveProfile();
  const name = fullName(profile);

  if (editing) {
    return (
      <li className="p-3">
        <ProfileForm
          title={`Edit ${profile.firstName}`}
          submitLabel="Save"
          profile={profile}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <strong className="flex flex-wrap items-center gap-2">
            {name} <Badge>{relationshipLabel(profile.relationship)}</Badge>
          </strong>
          <span className="text-sm text-muted">
            {profile.birthDate
              ? `${ageFrom(profile.birthDate)} · born ${shortDate(profile.birthDate)}`
              : "Birthday not added"}
          </span>
        </span>
        {!confirming && (
          <span className="flex gap-4">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Edit ${name}`}
              className={linkButton}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Remove ${name}`}
              className={linkButton}
            >
              Remove
            </button>
          </span>
        )}
      </div>
      {confirming && (
        <InlineConfirm
          question={`Remove ${profile.firstName}'s profile?`}
          confirmLabel="Yes, remove"
          onConfirm={() => remove.mutate(profile.id)}
          onCancel={() => setConfirming(false)}
          pending={remove.isPending}
        />
      )}
      {remove.isError && <ErrorAlert message={errorMessage(remove.error)} />}
    </li>
  );
}
