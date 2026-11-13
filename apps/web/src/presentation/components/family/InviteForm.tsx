import {
  ACCESS_LABELS,
  ACCESS_LEVELS,
  type AccessLevel,
  AUTH_LIMITS,
  type FamilyRelationship,
} from "@talaan/shared";
import { type FormEvent, useState } from "react";
import { useInviteFamily, relationshipOptions } from "@talaan/client";
import { errorMessage, fieldError } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { SelectField } from "../ui/SelectField";
import { TextField } from "../ui/TextField";
import { buttonPrimary, buttonSecondary } from "../ui/styles";

// Invite by email: who they are to you and what they can do
export function InviteForm({
  onDone,
  onCancel,
}: {
  onDone: (email: string) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [access, setAccess] = useState<AccessLevel>("view");
  const invite = useInviteFamily();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await invite.mutateAsync({
        email,
        relationship: relationship as FamilyRelationship,
        access,
      });
      onDone(email.trim());
    } catch {
      // Shown below from invite.error
    }
  }

  const error = invite.error;
  const fieldErrors =
    fieldError(error, "email") ??
    fieldError(error, "relationship") ??
    fieldError(error, "access");
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-edge bg-white p-4"
    >
      <h3 className="font-bold">Invite someone</h3>
      {invite.isError && !fieldErrors && (
        <ErrorAlert message={errorMessage(error)} />
      )}
      <TextField
        label="Their email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="off"
        maxLength={AUTH_LIMITS.emailMax}
        autoFocus
        error={fieldError(error, "email")}
      />
      <SelectField
        label="Who they are to you"
        value={relationship}
        onChange={setRelationship}
        options={relationshipOptions}
        placeholder="Choose…"
        error={fieldError(error, "relationship")}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">
          What they can do
        </legend>
        {ACCESS_LEVELS.map((level) => (
          <label
            key={level}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 ${
              access === level ? "border-brand bg-brand-soft" : "border-edge"
            }`}
          >
            <input
              type="radio"
              name="access"
              value={level}
              checked={access === level}
              onChange={() => setAccess(level)}
              className="mt-1 size-4 cursor-pointer accent-brand"
            />
            <span className="flex flex-col">
              <strong>{ACCESS_LABELS[level].name}</strong>
              <span className="text-sm text-muted">
                {ACCESS_LABELS[level].detail}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-sm text-muted">
        They get an email with a link. To accept, they sign in (or sign up) with
        this same email.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={invite.isPending}
          className={buttonPrimary}
        >
          {invite.isPending ? "Sending…" : "Send invitation"}
        </button>
        <button type="button" onClick={onCancel} className={buttonSecondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
