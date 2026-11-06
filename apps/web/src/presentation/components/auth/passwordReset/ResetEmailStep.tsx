import { RESET_CODE } from "@talaan/shared";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { errorMessage, fieldError } from "../../../format/errorMessage";
import { AuthCard } from "../../layout/AuthCard";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { TextField } from "../../ui/TextField";
import { buttonPrimary } from "../../ui/styles";

// Step 1 of Forgot password: the email to send the code to
export function ResetEmailStep({
  email,
  onEmailChange,
  onSubmit,
  pending,
  error,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: (event: FormEvent) => void;
  pending: boolean;
  error: unknown;
}) {
  return (
    <AuthCard title="Reset your password">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-muted">
          Enter the email you signed up with. We'll send you a{" "}
          {RESET_CODE.length}-digit code.
        </p>
        {error != null && !fieldError(error, "email") && (
          <ErrorAlert message={errorMessage(error)} />
        )}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={onEmailChange}
          autoComplete="email"
          required
          error={fieldError(error, "email")}
        />
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Sending…" : "Send code"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Remembered it?{" "}
        <Link to="/login" className="font-semibold text-brand underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
