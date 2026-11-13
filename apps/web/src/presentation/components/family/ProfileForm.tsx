import {
  AUTH_LIMITS,
  type FamilyProfileInfo,
  type FamilyRelationship,
} from "@talaan/shared";
import { type FormEvent, useState } from "react";
import {
  useAddProfile,
  useUpdateProfile,
  relationshipOptions,
} from "@talaan/client";
import { errorMessage, fieldError } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { SelectField } from "../ui/SelectField";
import { TextField } from "../ui/TextField";
import { buttonPrimary, buttonSecondary } from "../ui/styles";

// Adding or editing a profile
export function ProfileForm({
  title,
  submitLabel,
  profile,
  onDone,
  onCancel,
}: {
  title: string;
  submitLabel: string;
  profile?: FamilyProfileInfo;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [middleName, setMiddleName] = useState(profile?.middleName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const [relationship, setRelationship] = useState<string>(
    profile?.relationship ?? "",
  );
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? "");
  const add = useAddProfile();
  const update = useUpdateProfile();
  const save = profile ? update : add;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const fields = {
      firstName,
      middleName,
      lastName,
      relationship: relationship as FamilyRelationship,
      birthDate,
    };
    try {
      if (profile) await update.mutateAsync({ id: profile.id, fields });
      else await add.mutateAsync(fields);
      onDone();
    } catch {
      // Shown below from save.error
    }
  }

  const error = save.error;
  const fields = [
    "firstName",
    "middleName",
    "lastName",
    "relationship",
    "birthDate",
  ];
  const hasFieldError = fields.some((f) => fieldError(error, f));
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-edge bg-white p-4"
    >
      <h3 className="font-bold">{title}</h3>
      {save.isError && !hasFieldError && (
        <ErrorAlert message={errorMessage(error)} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="First name"
          value={firstName}
          onChange={setFirstName}
          maxLength={AUTH_LIMITS.nameMax}
          autoFocus
          error={fieldError(error, "firstName")}
        />
        <TextField
          label="Middle name (optional)"
          value={middleName}
          onChange={setMiddleName}
          maxLength={AUTH_LIMITS.nameMax}
          error={fieldError(error, "middleName")}
        />
        <TextField
          label="Last name"
          value={lastName}
          onChange={setLastName}
          maxLength={AUTH_LIMITS.nameMax}
          error={fieldError(error, "lastName")}
        />
        <SelectField
          label="Who they are to you"
          value={relationship}
          onChange={setRelationship}
          options={relationshipOptions}
          placeholder="Choose…"
          error={fieldError(error, "relationship")}
        />
        <TextField
          label="Birthday (optional)"
          type="date"
          value={birthDate}
          onChange={setBirthDate}
          min="1900-01-01"
          max={new Date().toISOString().slice(0, 10)}
          error={fieldError(error, "birthDate")}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={save.isPending}
          className={buttonPrimary}
        >
          {save.isPending ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={buttonSecondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
