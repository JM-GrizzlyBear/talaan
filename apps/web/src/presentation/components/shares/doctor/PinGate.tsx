import { LockKeyhole } from "lucide-react";
import { type FormEvent, useState } from "react";
import { errorMessage, fieldError } from "../../../format/errorMessage";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { TextField } from "../../ui/TextField";
import { buttonPrimary } from "../../ui/styles";

// Before anything shows: the PIN the family told the doctor
export function PinGate({
  onSubmit,
  pending,
  error,
  waitUntil,
}: {
  onSubmit: (pin: string) => void;
  pending: boolean;
  error: unknown;
  waitUntil: string | null;
}) {
  const [pin, setPin] = useState("");
  const pinError = fieldError(error, "pin");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(pin);
  };
  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border border-edge bg-white p-6"
    >
      <LockKeyhole aria-hidden="true" className="size-8 text-brand" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Enter the PIN</h1>
        <p className="text-muted">
          These health records were shared with a PIN. The family gave it to you
          separately.
        </p>
      </div>
      <div className="w-48">
        <TextField
          label="PIN (6 digits)"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={pin}
          onChange={(v) => setPin(v.replace(/\D/g, ""))}
          error={pinError}
          autoFocus
        />
      </div>
      {Boolean(error) && !pinError && (
        <ErrorAlert message={errorMessage(error)} />
      )}
      {!error && waitUntil && (
        <ErrorAlert message="Too many wrong PINs. Please wait a few minutes, then try again." />
      )}
      <button
        type="submit"
        disabled={pending || pin.length !== 6}
        className={`${buttonPrimary} self-start`}
      >
        {pending ? "Opening…" : "Open the records"}
      </button>
    </form>
  );
}
