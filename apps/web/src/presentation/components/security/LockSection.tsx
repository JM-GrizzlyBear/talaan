import {
  LOCK_AFTER_MINUTES,
  type LockAfterMinutes,
  type PublicUser,
} from "@talaan/shared";
import { useUpdateSecuritySettings, useLock } from "@talaan/client";
import { errorMessage } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { Notice } from "../ui/Notice";
import { buttonSecondary } from "../ui/styles";

// How long Talaan waits, with nobody using it, before it locks; and "Lock now"
export function LockSection({ user }: { user: PublicUser }) {
  const settings = useUpdateSecuritySettings();
  const lock = useLock();

  return (
    <section aria-labelledby="lock-heading" className="flex flex-col gap-3">
      <h2 id="lock-heading" className="text-lg font-bold">
        Lock Talaan after I'm away for
      </h2>
      <p className="text-sm text-muted">
        Your records are hidden until you enter your password again. On a shared
        or office computer, sign out when you're done.
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
  );
}
