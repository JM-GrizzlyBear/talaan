import { AUTH_LIMITS } from "@talaan/shared";
import { type FormEvent, useState } from "react";
import { useChangePassword } from "@talaan/client";
import { errorMessage, fieldError } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { ForgotCurrentPassword } from "./ForgotCurrentPassword";
import { Notice } from "../ui/Notice";
import { TextField } from "../ui/TextField";
import { buttonPrimary } from "../ui/styles";

// Change the password: this browser stays signed in, the others are signed out
export function ChangePasswordForm({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const change = useChangePassword();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      // Shown below from change.error
    }
  }

  const error = change.error;
  const fieldErrors =
    fieldError(error, "currentPassword") ?? fieldError(error, "newPassword");
  return (
    <section
      id="password"
      aria-labelledby="password-heading"
      className="flex scroll-mt-20 flex-col gap-3"
    >
      <h2 id="password-heading" className="text-lg font-bold">
        Change password
      </h2>
      <p className="text-sm text-muted">
        This browser stays signed in. Every other phone and computer is signed
        out, and we email you about the change.
      </p>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex max-w-sm flex-col gap-4"
      >
        {change.isError && !fieldErrors && (
          <ErrorAlert message={errorMessage(error)} />
        )}
        {change.isSuccess && (
          <Notice>Password changed. Other devices were signed out.</Notice>
        )}
        <TextField
          label="Current password"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          error={fieldError(error, "currentPassword")}
        />
        <TextField
          label={`New password (at least ${AUTH_LIMITS.passwordMin} characters)`}
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          maxLength={AUTH_LIMITS.passwordMax}
          error={fieldError(error, "newPassword")}
        />
        <button
          type="submit"
          disabled={change.isPending}
          className={`${buttonPrimary} self-start`}
        >
          {change.isPending ? "Saving…" : "Change password"}
        </button>
      </form>
      <ForgotCurrentPassword email={email} />
    </section>
  );
}
