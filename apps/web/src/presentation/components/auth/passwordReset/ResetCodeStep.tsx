import { RESET_CODE } from "@talaan/shared";
import type { FormEvent } from "react";
import { errorMessage, fieldError } from "../../../format/errorMessage";
import { AuthCard } from "../../layout/AuthCard";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { Notice } from "../../ui/Notice";
import { TextField } from "../../ui/TextField";
import { buttonPrimary, buttonSecondary } from "../../ui/styles";

// Step 2 of Forgot password: the 6-digit code from the email
export function ResetCodeStep({
  email,
  code,
  onCodeChange,
  onSubmit,
  onResend,
  onChangeEmail,
  checking,
  sending,
  resent,
  checkError,
  error,
}: {
  email: string;
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: (event: FormEvent) => void;
  onResend: () => void;
  onChangeEmail: () => void;
  checking: boolean;
  sending: boolean;
  // A new code was just sent
  resent: boolean;
  // From checking the code (shown under the box)
  checkError: unknown;
  // From checking, or from sending a new code
  error: unknown;
}) {
  return (
    <AuthCard title="Check your email">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-muted">
          If <strong className="text-gray-900">{email}</strong> has a Talaan
          account, we sent a {RESET_CODE.length}-digit code to it. It works for{" "}
          {RESET_CODE.minutes} minutes. Check your spam folder too.
        </p>
        {resent && !error && <Notice>We sent a new code.</Notice>}
        {error != null && !fieldError(error, "code") && (
          <ErrorAlert message={errorMessage(error)} />
        )}
        <TextField
          label="Code"
          value={code}
          onChange={(value) =>
            onCodeChange(value.replace(/\D/g, "").slice(0, RESET_CODE.length))
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          className="text-center text-2xl tracking-[0.4em]"
          error={fieldError(checkError, "code")}
        />
        <button
          type="submit"
          disabled={checking || code.length !== RESET_CODE.length}
          className={buttonPrimary}
        >
          {checking ? "Checking…" : "Continue"}
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onResend}
            disabled={sending}
            className={buttonSecondary}
          >
            {sending ? "Sending…" : "Send a new code"}
          </button>
          <button
            type="button"
            onClick={onChangeEmail}
            className={buttonSecondary}
          >
            Use another email
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
