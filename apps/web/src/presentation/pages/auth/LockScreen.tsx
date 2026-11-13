import { fullName, type PublicUser } from "@talaan/shared";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useLogOut, usePasskeyUnlock, useUnlock } from "@talaan/client";
import { passkeysSupported } from "../../../infrastructure/passkeys/devicePasskeys";
import { PasskeyButton } from "../../components/auth/PasskeyButton";
import { Notice } from "../../components/ui/Notice";
import { TalaanLogo } from "../../components/brand/TalaanLogo";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { TextField } from "../../components/ui/TextField";
import { buttonPrimary } from "../../components/ui/styles";
import {
  errorMessage,
  fieldError,
  isPasskeyCancelled,
} from "../../format/errorMessage";

// Shown instead of any page after nobody used the website for a while
export function LockScreen({ user }: { user: PublicUser }) {
  const [password, setPassword] = useState("");
  const unlock = useUnlock();
  const passkey = usePasskeyUnlock();
  const logOut = useLogOut();
  const canUsePasskey = user.passkeyCount > 0 && passkeysSupported();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    passkey.reset();
    try {
      await unlock.mutateAsync(password);
    } catch {
      // Shown below from unlock.error
    }
  }

  function handlePasskey() {
    unlock.reset();
    passkey.mutate();
  }

  const error = unlock.error;
  const passwordError = fieldError(error, "password");
  return (
    <main className="flex min-h-screen items-center justify-center bg-deep px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <TalaanLogo className="size-12" />
        <h1 className="mt-4 text-2xl font-bold">Talaan is locked</h1>
        <p className="mt-2 text-muted">
          Nobody used Talaan for {user.lockAfterMinutes} minutes, so we locked
          your records.{" "}
          {canUsePasskey
            ? "Use your passkey or enter your password to continue."
            : "Enter your password to continue."}
        </p>
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-page px-3 py-2.5">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-brand-soft font-bold text-deep"
          >
            {user.firstName.slice(0, 1).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col text-sm">
            <strong className="truncate">{fullName(user)}</strong>
            <span className="truncate text-muted">{user.email}</span>
          </span>
        </div>
        {canUsePasskey && (
          <div className="mt-5 flex flex-col gap-3">
            {passkey.isError &&
              (isPasskeyCancelled(passkey.error) ? (
                <Notice>{errorMessage(passkey.error)}</Notice>
              ) : (
                <ErrorAlert message={errorMessage(passkey.error)} />
              ))}
            <PasskeyButton
              onClick={handlePasskey}
              pending={passkey.isPending}
              label="Unlock with a passkey"
            />
            <p className="flex items-center gap-3 text-xs font-semibold tracking-wide text-muted uppercase">
              <span className="h-px flex-1 bg-edge" />
              or your password
              <span className="h-px flex-1 bg-edge" />
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          {unlock.isError && !passwordError && (
            <ErrorAlert message={errorMessage(error)} />
          )}
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            autoFocus={!canUsePasskey}
            required
            error={passwordError}
          />
          <button
            type="submit"
            disabled={unlock.isPending}
            className={buttonPrimary}
          >
            {unlock.isPending ? "Unlocking…" : "Unlock"}
          </button>
        </form>
        <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
          <Link
            to="/forgot-password"
            className="font-semibold text-brand underline"
          >
            Forgot password?
          </Link>
          <button
            type="button"
            onClick={() => logOut.mutate()}
            disabled={logOut.isPending}
            className="cursor-pointer font-semibold text-brand underline"
          >
            Not you? Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
