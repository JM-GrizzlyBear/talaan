import { EMAIL_CODE, TRUSTED_BROWSER_DAYS } from "@talaan/shared";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  useLogIn,
  usePasskeySignIn,
  useResendSignInCode,
  useSignInCode,
} from "../../application/auth/useAuth";
import { ApiError } from "../../infrastructure/api/http";
import { passkeysSupported } from "../../infrastructure/passkeys/devicePasskeys";
import { PasskeyButton } from "../components/auth/PasskeyButton";
import { AuthCard } from "../components/layout/AuthCard";
import { CheckboxField } from "../components/ui/CheckboxField";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Notice } from "../components/ui/Notice";
import { TextField } from "../components/ui/TextField";
import { buttonPrimary } from "../components/ui/styles";
import {
  errorMessage,
  fieldError,
  isPasskeyCancelled,
} from "../format/errorMessage";

export function LoginPage() {
  const location = useLocation();
  const state = location.state as {
    from?: string;
    email?: string;
    passwordChanged?: boolean;
  } | null;
  const navigate = useNavigate();
  // Back to the page that asked for a sign-in, or the home page
  const from = state?.from ?? "/";
  const done = () => navigate(from, { replace: true });

  // Two-step: after the password, the masked email the code went to
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  if (codeSentTo) {
    return (
      <CodeStep
        sentTo={codeSentTo}
        onDone={done}
        onStartOver={(timedOut) => {
          setCodeSentTo(null);
          setExpired(timedOut);
        }}
      />
    );
  }
  return (
    <PasswordStep
      initialEmail={state?.email ?? ""}
      passwordChanged={state?.passwordChanged ?? false}
      expired={expired}
      onCodeSent={(email) => {
        setExpired(false);
        setCodeSentTo(email);
      }}
      onDone={done}
    />
  );
}

function PasswordStep({
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

function CodeStep({
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
