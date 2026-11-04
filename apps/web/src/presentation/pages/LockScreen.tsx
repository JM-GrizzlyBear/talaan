import type { PublicUser } from "@talaan/shared";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useLogOut, useUnlock } from "../../application/auth/useAuth";
import { TalaanLogo } from "../components/brand/TalaanLogo";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { TextField } from "../components/ui/TextField";
import { buttonPrimary } from "../components/ui/styles";
import { errorMessage, fieldError } from "../format/errorMessage";

// Shown instead of any page after nobody used the website for a while
export function LockScreen({ user }: { user: PublicUser }) {
  const [password, setPassword] = useState("");
  const unlock = useUnlock();
  const logOut = useLogOut();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await unlock.mutateAsync(password);
    } catch {
      // Shown below from unlock.error
    }
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
          your records. Enter your password to continue.
        </p>
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-page px-3 py-2.5">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-brand-soft font-bold text-deep"
          >
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col text-sm">
            <strong className="truncate">{user.name}</strong>
            <span className="truncate text-muted">{user.email}</span>
          </span>
        </div>
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
            autoFocus
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
