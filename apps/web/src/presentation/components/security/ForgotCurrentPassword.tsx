import { AUTH_LIMITS } from "@talaan/shared";
import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import {
  SESSION_KEY,
  useCompletePasswordReset,
  useRequestResetCode,
} from "@talaan/client";
import { errorMessage, fieldError } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { Notice } from "../ui/Notice";
import { TextField } from "../ui/TextField";
import { buttonPrimary, buttonSecondary } from "../ui/styles";

// Signed in but don't know the current password: a code to your email, then
// a new password. Like Forgot password, but without leaving the Security page.
export function ForgotCurrentPassword({ email }: { email: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmError, setConfirmError] = useState<string>();
  const request = useRequestResetCode();
  const complete = useCompletePasswordReset();

  async function sendCode() {
    try {
      await request.mutateAsync(email);
      setOpen(true);
    } catch {
      // Shown from request.error
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setConfirmError("The passwords don't match");
      return;
    }
    setConfirmError(undefined);
    try {
      await complete.mutateAsync({ email, code, password });
      // Every device is signed out, this one too
      queryClient.setQueryData(SESSION_KEY, null);
      navigate("/login", {
        replace: true,
        state: { email, passwordChanged: true },
      });
    } catch {
      // Shown below from complete.error
    }
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        {request.isError && (
          <ErrorAlert message={errorMessage(request.error)} />
        )}
        <button
          type="button"
          onClick={() => void sendCode()}
          disabled={request.isPending}
          className="self-start text-sm font-semibold text-brand underline"
        >
          {request.isPending
            ? "Sending a code…"
            : "Forgot your current password? Email me a code"}
        </button>
      </div>
    );
  }

  const error = complete.error;
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex max-w-sm flex-col gap-4 rounded-2xl border border-edge p-4"
    >
      <Notice>
        We emailed a 6-digit code to {email}. After the new password, every
        device is signed out, this one too, and you sign in again.
      </Notice>
      {complete.isError &&
        !fieldError(error, "code") &&
        !fieldError(error, "password") && (
          <ErrorAlert message={errorMessage(error)} />
        )}
      <TextField
        label="Code from the email"
        value={code}
        onChange={setCode}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        error={fieldError(error, "code")}
      />
      <TextField
        label={`New password (at least ${AUTH_LIMITS.passwordMin} characters)`}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        maxLength={AUTH_LIMITS.passwordMax}
        error={fieldError(error, "password")}
      />
      <TextField
        label="New password again"
        type="password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        maxLength={AUTH_LIMITS.passwordMax}
        error={confirmError}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={complete.isPending}
          className={buttonPrimary}
        >
          {complete.isPending ? "Saving…" : "Set the new password"}
        </button>
        <button
          type="button"
          onClick={() => void sendCode()}
          disabled={request.isPending}
          className={buttonSecondary}
        >
          Send another code
        </button>
      </div>
    </form>
  );
}
