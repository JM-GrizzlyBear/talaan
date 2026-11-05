import {
  AUTH_LIMITS,
  LOCK_AFTER_MINUTES,
  PASSKEY_NAME_MAX,
  TRUSTED_BROWSER_DAYS,
  type LockAfterMinutes,
  type PublicUser,
} from "@talaan/shared";
import { KeyRound, Laptop, MailCheck } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  useAddPasskey,
  useChangePassword,
  useForgetAllBrowsers,
  useForgetBrowser,
  usePasskeys,
  useRemovePasskey,
  useSignOutOtherDevices,
  useTrustedBrowsers,
  useUpdateSecuritySettings,
} from "../../application/auth/useAccount";
import { useCurrentUser, useLock } from "../../application/auth/useAuth";
import { passkeysSupported } from "../../infrastructure/passkeys/devicePasskeys";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Notice } from "../components/ui/Notice";
import { TextField } from "../components/ui/TextField";
import { buttonPrimary, buttonSecondary } from "../components/ui/styles";
import { shortDateTime } from "../format/dates";
import { suggestedPasskeyName } from "../format/deviceName";
import {
  errorMessage,
  fieldError,
  isPasskeyCancelled,
} from "../format/errorMessage";

const linkButton =
  "cursor-pointer text-sm font-semibold text-brand underline disabled:cursor-wait disabled:opacity-70";

export function SecurityPage() {
  const { data: user } = useCurrentUser();
  const settings = useUpdateSecuritySettings();
  const lock = useLock();
  if (!user) return null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <h1 className="text-3xl font-bold">Security</h1>

      <PasskeysSection />
      <TwoStepSection user={user} />

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
      <SignedInSection />
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

function SectionHeading({
  id,
  icon,
  children,
}: {
  id: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-lg font-bold">
      <span aria-hidden="true" className="text-brand">
        {icon}
      </span>
      {children}
    </h2>
  );
}

function PasskeysSection() {
  const passkeys = usePasskeys();
  const add = useAddPasskey();
  const remove = useRemovePasskey();
  const [name, setName] = useState(() =>
    suggestedPasskeyName(navigator.userAgent),
  );
  const [adding, setAdding] = useState(false);
  const supported = passkeysSupported();

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    try {
      await add.mutateAsync(name);
      setAdding(false);
    } catch {
      // Shown below from add.error
    }
  }

  const list = passkeys.data ?? [];
  return (
    <section aria-labelledby="passkeys-heading" className="flex flex-col gap-3">
      <SectionHeading
        id="passkeys-heading"
        icon={<KeyRound className="size-5" />}
      >
        Passkeys
      </SectionHeading>
      <p className="text-sm text-muted">
        Sign in and unlock with Face ID, a fingerprint, or your phone or
        computer's PIN, without typing a password. Your face and fingerprint
        never leave your device; Talaan only keeps a public key.
      </p>

      {passkeys.isError && (
        <ErrorAlert message={errorMessage(passkeys.error)} />
      )}
      {remove.isError && <ErrorAlert message={errorMessage(remove.error)} />}
      {list.length > 0 && (
        <ul className="flex flex-col divide-y divide-edge rounded-xl border border-edge bg-white">
          {list.map((passkey) => (
            <li
              key={passkey.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <span className="flex min-w-0 flex-col">
                <strong className="truncate">{passkey.name}</strong>
                <span className="text-sm text-muted">
                  Added {shortDateTime(passkey.createdAt)}
                  {passkey.lastUsedAt
                    ? ` · Last used ${shortDateTime(passkey.lastUsedAt)}`
                    : " · Not used yet"}
                  {passkey.synced && " · Synced to your other devices"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove.mutate(passkey.id)}
                disabled={remove.isPending}
                aria-label={`Remove ${passkey.name}`}
                className={linkButton}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {passkeys.isSuccess && list.length === 0 && (
        <p className="text-sm text-muted">You haven't added a passkey yet.</p>
      )}

      {!supported ? (
        <p className="text-sm text-muted">
          This browser can't use passkeys. Try a recent Chrome, Safari, Edge or
          Firefox.
        </p>
      ) : adding ? (
        <form
          onSubmit={handleAdd}
          noValidate
          className="flex max-w-sm flex-col gap-4"
        >
          {add.isError &&
            !fieldError(add.error, "name") &&
            (isPasskeyCancelled(add.error) ? (
              <Notice>{errorMessage(add.error)}</Notice>
            ) : (
              <ErrorAlert message={errorMessage(add.error)} />
            ))}
          <TextField
            label="Name this passkey"
            value={name}
            onChange={setName}
            maxLength={PASSKEY_NAME_MAX}
            autoFocus
            error={fieldError(add.error, "name")}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={add.isPending || !name.trim()}
              className={buttonPrimary}
            >
              {add.isPending ? "Waiting for your device…" : "Continue"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                add.reset();
              }}
              className={buttonSecondary}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {add.isSuccess && (
            <Notice>Passkey added. Next time, sign in with it.</Notice>
          )}
          <button
            type="button"
            onClick={() => {
              add.reset();
              setAdding(true);
            }}
            className={`${buttonSecondary} self-start`}
          >
            Add a passkey
          </button>
        </>
      )}
    </section>
  );
}

function TwoStepSection({ user }: { user: PublicUser }) {
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

function SignedInSection() {
  const browsers = useTrustedBrowsers();
  const forget = useForgetBrowser();
  const forgetAll = useForgetAllBrowsers();
  const signOutOthers = useSignOutOtherDevices();
  const list = browsers.data ?? [];
  const error = browsers.error ?? forget.error ?? forgetAll.error;

  return (
    <section aria-labelledby="devices-heading" className="flex flex-col gap-3">
      <SectionHeading id="devices-heading" icon={<Laptop className="size-5" />}>
        Browsers and devices
      </SectionHeading>
      <p className="text-sm text-muted">
        Remembered browsers skip the emailed code for {TRUSTED_BROWSER_DAYS}{" "}
        days. Forget one you no longer use, or that isn't yours.
      </p>
      {error && <ErrorAlert message={errorMessage(error)} />}
      {list.length > 0 ? (
        <ul className="flex flex-col divide-y divide-edge rounded-xl border border-edge bg-white">
          {list.map((browser) => (
            <li
              key={browser.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <span className="flex min-w-0 flex-col">
                <strong className="truncate">
                  {browser.label}
                  {browser.current && (
                    <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-deep">
                      This browser
                    </span>
                  )}
                </strong>
                <span className="text-sm text-muted">
                  Last used {shortDateTime(browser.lastUsedAt)} · Remembered
                  until {shortDateTime(browser.expiresAt)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => forget.mutate(browser.id)}
                disabled={forget.isPending}
                aria-label={`Forget ${browser.label}`}
                className={linkButton}
              >
                Forget
              </button>
            </li>
          ))}
        </ul>
      ) : (
        browsers.isSuccess && (
          <p className="text-sm text-muted">No remembered browsers.</p>
        )
      )}
      <div className="flex flex-wrap gap-2">
        {list.length > 1 && (
          <button
            type="button"
            onClick={() => forgetAll.mutate()}
            disabled={forgetAll.isPending}
            className={buttonSecondary}
          >
            Forget all browsers
          </button>
        )}
        <button
          type="button"
          onClick={() => signOutOthers.mutate()}
          disabled={signOutOthers.isPending}
          className={buttonSecondary}
        >
          {signOutOthers.isPending
            ? "Signing out…"
            : "Sign out everywhere else"}
        </button>
      </div>
      {signOutOthers.isSuccess && (
        <Notice>Every other browser and device was signed out.</Notice>
      )}
      {signOutOthers.isError && (
        <ErrorAlert message={errorMessage(signOutOthers.error)} />
      )}
    </section>
  );
}
