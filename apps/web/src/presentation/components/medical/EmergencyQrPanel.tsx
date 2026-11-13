import {
  DEFAULT_EMERGENCY_EXTRAS,
  EMERGENCY_EXTRA_LABELS,
  EMERGENCY_EXTRAS,
  type EmergencyExtra,
  type MedicalIdInfo,
} from "@talaan/shared";
import { ExternalLink, QrCode as QrIcon } from "lucide-react";
import { useState } from "react";
import { useSaveEmergency } from "@talaan/client";
import { errorMessage } from "../../format/errorMessage";
import { QrCode } from "../places/QrCode";
import { CheckboxField } from "../ui/CheckboxField";
import { ErrorAlert } from "../ui/ErrorAlert";
import { InlineConfirm } from "../ui/InlineConfirm";
import { buttonPrimary, buttonSecondary, dangerLinkButton } from "../ui/styles";
import { emergencyUrl } from "./emergencyUrl";

// The emergency QR: anyone who scans it sees the contacts (and only the
// extras chosen here), without signing in
export function EmergencyQrPanel({ medicalId }: { medicalId: MedicalIdInfo }) {
  const person = {
    ownerId: medicalId.ownerId,
    profileId: medicalId.profileId ?? "self",
  };
  const save = useSaveEmergency(person);
  const [renewing, setRenewing] = useState(false);
  const { on, token } = medicalId.emergency;
  // The ticks change at once; the server's answer replaces them when it comes
  const saved = medicalId.emergency.extras;
  const [extras, setExtras] = useState(saved);
  const [seen, setSeen] = useState(saved);
  if (seen !== saved) {
    setSeen(saved);
    setExtras(saved);
  }

  const toggleExtra = (extra: EmergencyExtra, checked: boolean) => {
    const next = checked
      ? [...extras, extra]
      : extras.filter((e) => e !== extra);
    setExtras(next);
    save.mutate({ on, extras: next }, { onError: () => setExtras(saved) });
  };

  return (
    <section
      aria-labelledby="emergency-heading"
      className="flex flex-col gap-3 rounded-xl border border-edge bg-white p-4"
    >
      <h2
        id="emergency-heading"
        className="flex items-center gap-2 text-lg font-bold"
      >
        <QrIcon aria-hidden="true" className="size-5 text-brand" />
        Emergency QR
      </h2>
      <p className="text-sm text-muted">
        For the wallet card and lock screen. Anyone who scans it, without
        signing in, sees {medicalId.personName.split(" ")[0]}'s emergency
        contacts with call buttons, and only what you tick below.
      </p>
      {save.isError && <ErrorAlert message={errorMessage(save.error)} />}

      {!on ? (
        <button
          type="button"
          // The first time: name, address and blood type start ticked
          onClick={() =>
            save.mutate({
              on: true,
              extras: token ? extras : DEFAULT_EMERGENCY_EXTRAS,
            })
          }
          disabled={save.isPending}
          className={`${buttonPrimary} self-start`}
        >
          Turn on the emergency QR
        </button>
      ) : (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">
              Also show (the contacts always show)
            </legend>
            {EMERGENCY_EXTRAS.map((extra) => (
              <CheckboxField
                key={extra}
                checked={extras.includes(extra)}
                onChange={(checked) => toggleExtra(extra, checked)}
              >
                {EMERGENCY_EXTRA_LABELS[extra]}
                {extra === "fullName" && (
                  <span className="text-muted">
                    {" "}
                    (otherwise the first name and an initial)
                  </span>
                )}
              </CheckboxField>
            ))}
          </fieldset>
          {extras.includes("address") && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Anyone who finds the card or phone can read the address. It helps
              rescuers bring {medicalId.personName.split(" ")[0]} home, but
              untick it if that worries you.
            </p>
          )}
          {token && (
            <div className="flex flex-wrap items-center gap-4">
              <QrCode
                text={emergencyUrl(token)}
                title="Emergency QR code"
                className="size-32 shrink-0"
              />
              <div className="flex flex-col gap-2">
                <a
                  href={emergencyUrl(token)}
                  target="_blank"
                  rel="noreferrer"
                  className={`${buttonSecondary} self-start`}
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                  See what it shows
                </a>
                {renewing ? (
                  <InlineConfirm
                    question="Make a new code? Cards and lock screens printed before stop working."
                    confirmLabel="Make a new code"
                    pending={save.isPending}
                    onConfirm={() =>
                      save.mutate(
                        { on, extras, newCode: true },
                        { onSettled: () => setRenewing(false) },
                      )
                    }
                    onCancel={() => setRenewing(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setRenewing(true)}
                    className={`${dangerLinkButton} self-start`}
                  >
                    Make a new code (if a card was lost)
                  </button>
                )}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => save.mutate({ on: false, extras })}
            disabled={save.isPending}
            className={`${buttonSecondary} self-start`}
          >
            Turn it off
          </button>
          <p className="text-xs text-muted">
            Turned off, the code shows nothing. Turned on again, the same
            printed code works again.
          </p>
        </>
      )}
    </section>
  );
}
