import { PASSKEY_NAME_MAX } from "@talaan/shared";
import { KeyRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  useAddPasskey,
  usePasskeys,
  useRemovePasskey,
  shortDateTime,
} from "@talaan/client";
import { passkeysSupported } from "../../../infrastructure/passkeys/devicePasskeys";
import { suggestedPasskeyName } from "../../format/deviceName";
import {
  errorMessage,
  fieldError,
  isPasskeyCancelled,
} from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { Notice } from "../ui/Notice";
import { SectionHeading } from "../ui/SectionHeading";
import { TextField } from "../ui/TextField";
import {
  buttonPrimary,
  buttonSecondary,
  linkButton,
  listCard,
} from "../ui/styles";

// Passkeys: list, add (the device shows its own prompt), remove
export function PasskeysSection() {
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
        <ul className={listCard}>
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
