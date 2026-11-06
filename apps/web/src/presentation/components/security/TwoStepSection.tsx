import type { PublicUser } from "@talaan/shared";
import { MailCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useUpdateSecuritySettings } from "../../../application/auth/useAccount";
import { errorMessage, fieldError } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { SectionHeading } from "../ui/SectionHeading";
import { TextField } from "../ui/TextField";
import { buttonPrimary, buttonSecondary } from "../ui/styles";

// Two-step sign-in on or off (turning it off needs the password)
export function TwoStepSection({ user }: { user: PublicUser }) {
  const settings = useUpdateSecuritySettings();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");

  async function turnOff(event: FormEvent) {
    event.preventDefault();
    try {
      await settings.mutateAsync({
        twoStepEnabled: false,
        currentPassword: password,
      });
      setConfirming(false);
      setPassword("");
    } catch {
      // Shown below from settings.error
    }
  }

  const passwordError = fieldError(settings.error, "currentPassword");
  return (
    <section aria-labelledby="twostep-heading" className="flex flex-col gap-3">
      <SectionHeading
        id="twostep-heading"
        icon={<MailCheck className="size-5" />}
      >
        Two-step sign-in
      </SectionHeading>
      <p className="text-sm text-muted">
        On a browser Talaan doesn't know yet, signing in with your password also
        needs a code from your email. Someone who learns your password still
        can't get in. Passkeys don't need the code.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-edge bg-white px-4 py-3">
        <span className="font-semibold">
          {user.twoStepEnabled ? "On" : "Off"}
          <span className="ml-2 font-normal text-muted">
            {user.twoStepEnabled
              ? "· Recommended for health records"
              : "· Only your password protects your account"}
          </span>
        </span>
        {user.twoStepEnabled ? (
          !confirming && (
            <button
              type="button"
              onClick={() => {
                settings.reset();
                setConfirming(true);
              }}
              className={buttonSecondary}
            >
              Turn off
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => settings.mutate({ twoStepEnabled: true })}
            disabled={settings.isPending}
            className={buttonPrimary}
          >
            Turn on
          </button>
        )}
      </div>
      {settings.isError && !passwordError && (
        <ErrorAlert message={errorMessage(settings.error)} />
      )}
      {confirming && (
        <form
          onSubmit={turnOff}
          noValidate
          className="flex max-w-sm flex-col gap-4"
        >
          <TextField
            label="Enter your password to turn it off"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            autoFocus
            error={passwordError}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={settings.isPending || !password}
              className={buttonPrimary}
            >
              {settings.isPending ? "Saving…" : "Turn off two-step"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setPassword("");
                settings.reset();
              }}
              className={buttonSecondary}
            >
              Keep it on
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
