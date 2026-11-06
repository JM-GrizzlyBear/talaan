import { EMAIL_CODE } from "@talaan/shared";
import { type FormEvent, useState } from "react";
import { Link, useLocation } from "react-router";
import { useLogIn, usePasskeySignIn } from "../../../application/auth/useAuth";
import { passkeysSupported } from "../../../infrastructure/passkeys/devicePasskeys";
import { errorMessage, isPasskeyCancelled } from "../../format/errorMessage";
import { AuthCard } from "../layout/AuthCard";
import { ErrorAlert } from "../ui/ErrorAlert";
import { Notice } from "../ui/Notice";
import { TextField } from "../ui/TextField";
import { buttonPrimary } from "../ui/styles";
import { PasskeyButton } from "./PasskeyButton";

// Sign in: email and password, or a passkey
export function PasswordStep({
  initialEmail,
  passwordChanged,
  expired,
  onCodeSent,
  onDone,
}: {
  initialEmail: string;
  passwordChanged: boolean;
  expired: boolean;
  onCodeSent: (maskedEmail: string) => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const logIn = useLogIn();
  const passkey = usePasskeySignIn();
  // Kept when switching to sign-up, so both come back to the same page
  const from = (useLocation().state as { from?: string } | null)?.from;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    passkey.reset();
    try {
      const result = await logIn.mutateAsync({ email, password });
      if (result.twoStep) onCodeSent(result.email);
      else onDone();
    } catch {
      // Shown below from logIn.error
    }
  }

  async function handlePasskey() {
    logIn.reset();
    try {
      await passkey.mutateAsync();
      onDone();
    } catch {
      // Shown below from passkey.error
    }
  }

  const error = logIn.error ?? passkey.error;
  return (
    <AuthCard title="Sign in">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {passwordChanged && !error && (
          <Notice>Password changed. Sign in with your new password.</Notice>
        )}
        {expired && !error && (
          <Notice>
            That took more than {EMAIL_CODE.minutes} minutes, so please sign in
            again.
          </Notice>
        )}
        {error &&
          (isPasskeyCancelled(error) ? (
            <Notice>{errorMessage(error)}</Notice>
          ) : (
            <ErrorAlert message={errorMessage(error)} />
          ))}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        <Link
          to="/forgot-password"
          state={{ email }}
          className="self-start text-sm font-semibold text-brand underline"
        >
          Forgot password?
        </Link>
        <button
          type="submit"
          disabled={logIn.isPending}
          className={buttonPrimary}
        >
          {logIn.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {passkeysSupported() && (
        <div className="mt-5 flex flex-col gap-3">
          <p className="flex items-center gap-3 text-xs font-semibold tracking-wide text-muted uppercase">
            <span className="h-px flex-1 bg-edge" />
            or
            <span className="h-px flex-1 bg-edge" />
          </p>
          <PasskeyButton onClick={handlePasskey} pending={passkey.isPending} />
        </div>
      )}
      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link
          to="/register"
          state={from ? { from } : undefined}
          className="font-semibold text-brand underline"
        >
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
