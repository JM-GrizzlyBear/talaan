import { AUTH_LIMITS, RESET_CODE } from "@talaan/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { SESSION_KEY } from "../../application/auth/useAuth";
import {
  useCheckResetCode,
  useCompletePasswordReset,
  useRequestResetCode,
} from "../../application/auth/usePasswordReset";
import { AuthCard } from "../components/layout/AuthCard";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Notice } from "../components/ui/Notice";
import { TextField } from "../components/ui/TextField";
import { buttonPrimary, buttonSecondary } from "../components/ui/styles";
import { errorMessage, fieldError } from "../format/errorMessage";

type Step = "email" | "code" | "password";

// Forgot password in 3 steps: email → the 6-digit code from the email → a new password
export function ForgotPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(
    (location.state as { email?: string } | null)?.email ?? "",
  );
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmError, setConfirmError] = useState<string>();
  const [resent, setResent] = useState(false);

  const requestCode = useRequestResetCode();
  const checkCode = useCheckResetCode();
  const complete = useCompletePasswordReset();

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    try {
      await requestCode.mutateAsync(email);
      setResent(step === "code");
      setCode("");
      checkCode.reset();
      setStep("code");
    } catch {
      // Shown from requestCode.error
    }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    try {
      await checkCode.mutateAsync({ email, code });
      setStep("password");
    } catch {
      // Shown from checkCode.error
    }
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setConfirmError("The passwords don't match");
      return;
    }
    setConfirmError(undefined);
    try {
      await complete.mutateAsync({ email, code, password });
      // Every device was signed out, this one included
      queryClient.setQueryData(SESSION_KEY, null);
      navigate("/login", {
        replace: true,
        state: { email, passwordChanged: true },
      });
    } catch {
      // Shown from complete.error. A code problem sends them back a step.
      if (fieldError(complete.error, "code")) setStep("code");
    }
  }

  if (step === "code") {
    const error = checkCode.error ?? requestCode.error;
    return (
      <AuthCard title="Check your email">
        <form onSubmit={submitCode} noValidate className="flex flex-col gap-4">
          <p className="text-muted">
            If <strong className="text-gray-900">{email}</strong> has a Talaan
            account, we sent a {RESET_CODE.length}-digit code to it. It works
            for {RESET_CODE.minutes} minutes. Check your spam folder too.
          </p>
          {resent && !error && <Notice>We sent a new code.</Notice>}
          {error && !fieldError(error, "code") && (
            <ErrorAlert message={errorMessage(error)} />
          )}
          <TextField
            label="Code"
            value={code}
            onChange={(value) =>
              setCode(value.replace(/\D/g, "").slice(0, RESET_CODE.length))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="000000"
            className="text-center text-2xl tracking-[0.4em]"
            error={fieldError(checkCode.error, "code")}
          />
          <button
            type="submit"
            disabled={checkCode.isPending || code.length !== RESET_CODE.length}
            className={buttonPrimary}
          >
            {checkCode.isPending ? "Checking…" : "Continue"}
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={requestCode.isPending}
              className={buttonSecondary}
            >
              {requestCode.isPending ? "Sending…" : "Send a new code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setResent(false);
              }}
              className={buttonSecondary}
            >
              Use another email
            </button>
          </div>
        </form>
      </AuthCard>
    );
  }

  if (step === "password") {
    const error = complete.error;
    return (
      <AuthCard title="Choose a new password">
        <form
          onSubmit={submitPassword}
          noValidate
          className="flex flex-col gap-4"
        >
          <p className="text-muted">
            After this, every phone and computer signed in to your account is
            signed out.
          </p>
          {complete.isError && !fieldError(error, "password") && (
            <ErrorAlert message={errorMessage(error)} />
          )}
          <TextField
            label={`New password (at least ${AUTH_LIMITS.passwordMin} characters)`}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            maxLength={AUTH_LIMITS.passwordMax}
            autoFocus
            error={fieldError(error, "password")}
          />
          <TextField
            label="Type it again"
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            maxLength={AUTH_LIMITS.passwordMax}
            error={confirmError}
          />
          <button
            type="submit"
            disabled={complete.isPending}
            className={buttonPrimary}
          >
            {complete.isPending ? "Saving…" : "Save new password"}
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password">
      <form onSubmit={sendCode} noValidate className="flex flex-col gap-4">
        <p className="text-muted">
          Enter the email you signed up with. We'll send you a{" "}
          {RESET_CODE.length}-digit code.
        </p>
        {requestCode.isError && !fieldError(requestCode.error, "email") && (
          <ErrorAlert message={errorMessage(requestCode.error)} />
        )}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
          error={fieldError(requestCode.error, "email")}
        />
        <button
          type="submit"
          disabled={requestCode.isPending}
          className={buttonPrimary}
        >
          {requestCode.isPending ? "Sending…" : "Send code"}
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
