import {
  AUTH_LIMITS,
  LOCK_AFTER_MINUTES,
  type LockAfterMinutes,
} from "@talaan/shared";
import { useState, type FormEvent } from "react";
import {
  useChangePassword,
  useUpdateSecuritySettings,
} from "../../application/auth/useAccount";
import { useCurrentUser, useLock } from "../../application/auth/useAuth";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Notice } from "../components/ui/Notice";
import { TextField } from "../components/ui/TextField";
import { buttonPrimary, buttonSecondary } from "../components/ui/styles";
import { errorMessage, fieldError } from "../format/errorMessage";

export function SecurityPage() {
  const { data: user } = useCurrentUser();
  const settings = useUpdateSecuritySettings();
  const lock = useLock();
  if (!user) return null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <h1 className="text-3xl font-bold">Security</h1>

      <section aria-labelledby="lock-heading" className="flex flex-col gap-3">
        <h2 id="lock-heading" className="text-lg font-bold">
          Lock Talaan after I'm away for
        </h2>
        <p className="text-sm text-muted">
          Your records are hidden until you enter your password again. On a
          shared or office computer, sign out when you're done.
        </p>
        {settings.isError && (
          <ErrorAlert message={errorMessage(settings.error)} />
        )}
        <div
          role="radiogroup"
          aria-labelledby="lock-heading"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {LOCK_AFTER_MINUTES.map((minutes) => {
            const selected = user.lockAfterMinutes === minutes;
            return (
              <button
                key={minutes}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={settings.isPending}
                onClick={() =>
                  settings.mutate({
                    lockAfterMinutes: minutes as LockAfterMinutes,
                  })
                }
                className={`min-h-11 cursor-pointer rounded-lg border px-3 font-semibold ${
                  selected
                    ? "border-brand bg-brand text-white"
                    : "border-edge bg-white hover:bg-gray-50"
                }`}
              >
                {minutes === 60 ? "1 hour" : `${minutes} minutes`}
              </button>
            );
          })}
        </div>
        {settings.isSuccess && <Notice>Saved.</Notice>}
        <button
          type="button"
          onClick={() => lock.mutate()}
          className={`${buttonSecondary} self-start`}
        >
          Lock Talaan now
        </button>
      </section>

      <ChangePasswordForm />
    </main>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const change = useChangePassword();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      // Shown below from change.error
    }
  }

  const error = change.error;
  const fieldErrors =
    fieldError(error, "currentPassword") ?? fieldError(error, "newPassword");
  return (
    <section aria-labelledby="password-heading" className="flex flex-col gap-3">
      <h2 id="password-heading" className="text-lg font-bold">
        Change password
      </h2>
      <p className="text-sm text-muted">
        This browser stays signed in. Every other phone and computer is signed
        out, and we email you about the change.
      </p>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex max-w-sm flex-col gap-4"
      >
        {change.isError && !fieldErrors && (
          <ErrorAlert message={errorMessage(error)} />
        )}
        {change.isSuccess && (
          <Notice>Password changed. Other devices were signed out.</Notice>
        )}
        <TextField
          label="Current password"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          error={fieldError(error, "currentPassword")}
        />
        <TextField
          label={`New password (at least ${AUTH_LIMITS.passwordMin} characters)`}
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          maxLength={AUTH_LIMITS.passwordMax}
          error={fieldError(error, "newPassword")}
        />
        <button
          type="submit"
          disabled={change.isPending}
          className={`${buttonPrimary} self-start`}
        >
          {change.isPending ? "Saving…" : "Change password"}
        </button>
      </form>
    </section>
  );
}
