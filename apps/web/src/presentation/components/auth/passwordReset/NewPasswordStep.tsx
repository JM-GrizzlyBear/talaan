import { AUTH_LIMITS } from "@talaan/shared";
import type { FormEvent } from "react";
import { errorMessage, fieldError } from "../../../format/errorMessage";
import { AuthCard } from "../../layout/AuthCard";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { TextField } from "../../ui/TextField";
import { buttonPrimary } from "../../ui/styles";

// Step 3 of Forgot password: the new password, typed twice
export function NewPasswordStep({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  confirmError,
  onSubmit,
  pending,
  error,
}: {
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  // "The passwords don't match"
  confirmError?: string;
  onSubmit: (event: FormEvent) => void;
  pending: boolean;
  error: unknown;
}) {
  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-muted">
          After this, every phone and computer signed in to your account is
          signed out.
        </p>
        {error != null && !fieldError(error, "password") && (
          <ErrorAlert message={errorMessage(error)} />
        )}
        <TextField
          label={`New password (at least ${AUTH_LIMITS.passwordMin} characters)`}
          type="password"
          value={password}
          onChange={onPasswordChange}
          autoComplete="new-password"
          maxLength={AUTH_LIMITS.passwordMax}
          autoFocus
          error={fieldError(error, "password")}
        />
        <TextField
          label="Type it again"
          type="password"
          value={confirm}
          onChange={onConfirmChange}
          autoComplete="new-password"
          maxLength={AUTH_LIMITS.passwordMax}
          error={confirmError}
        />
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Saving…" : "Save new password"}
        </button>
      </form>
    </AuthCard>
  );
}
