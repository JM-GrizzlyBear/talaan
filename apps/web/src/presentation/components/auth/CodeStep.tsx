import { EMAIL_CODE, TRUSTED_BROWSER_DAYS } from "@talaan/shared";
import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { useResendSignInCode, useSignInCode, ApiError } from "@talaan/client";
import { errorMessage, fieldError } from "../../format/errorMessage";
import { AuthCard } from "../layout/AuthCard";
import { CheckboxField } from "../ui/CheckboxField";
import { ErrorAlert } from "../ui/ErrorAlert";
import { Notice } from "../ui/Notice";
import { TextField } from "../ui/TextField";
import { buttonPrimary } from "../ui/styles";

// Two-step sign-in: the 6-digit code from the email
export function CodeStep({
  sentTo,
  onDone,
  onStartOver,
}: {
  sentTo: string;
  onDone: () => void;
  onStartOver: (timedOut: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const [rememberBrowser, setRememberBrowser] = useState(true);
  const submit = useSignInCode();
  const resend = useResendSignInCode();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    resend.reset();
    try {
      await submit.mutateAsync({ code, rememberBrowser });
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.signInExpired) onStartOver(true);
      setCode("");
    }
  }

  async function handleResend() {
    submit.reset();
    try {
      await resend.mutateAsync();
      setCode("");
    } catch (error) {
      if (error instanceof ApiError && error.signInExpired) onStartOver(true);
    }
  }

  const error = submit.error ?? resend.error;
  const codeError = fieldError(submit.error, "code");
  return (
    <AuthCard title="Check your email">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-muted">
          We sent a {EMAIL_CODE.length}-digit code to{" "}
          <strong className="text-gray-900">{sentTo}</strong>. Enter it to
          finish signing in. It works for {EMAIL_CODE.minutes} minutes.
        </p>
        {resend.isSuccess && !error && (
          <Notice>We sent a new code. The old one no longer works.</Notice>
        )}
        {error && !codeError && <ErrorAlert message={errorMessage(error)} />}
        <TextField
          label="Code"
          value={code}
          onChange={(value) =>
            setCode(value.replace(/\D/g, "").slice(0, EMAIL_CODE.length))
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          autoFocus
          error={codeError}
        />
        <CheckboxField checked={rememberBrowser} onChange={setRememberBrowser}>
          Remember this browser for {TRUSTED_BROWSER_DAYS} days.{" "}
          <span className="text-muted">
            Leave it unticked on a shared or office computer.
          </span>
        </CheckboxField>
        <button
          type="submit"
          disabled={submit.isPending || code.length !== EMAIL_CODE.length}
          className={buttonPrimary}
        >
          {submit.isPending ? "Checking…" : "Finish signing in"}
        </button>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resend.isPending}
          className="cursor-pointer font-semibold text-brand underline"
        >
          {resend.isPending ? "Sending…" : "Send a new code"}
        </button>
        <button
          type="button"
          onClick={() => onStartOver(false)}
          className="cursor-pointer font-semibold text-brand underline"
        >
          Use a different account
        </button>
      </div>
      <p className="mt-4 text-xs text-muted">
        No email? Check your spam folder. If you didn't try to sign in, someone
        knows your password:{" "}
        <Link to="/forgot-password" className="font-semibold underline">
          change it
        </Link>
        .
      </p>
    </AuthCard>
  );
}
