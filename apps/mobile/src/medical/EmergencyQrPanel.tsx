import { useSaveEmergency } from "@talaan/client";
import {
  DEFAULT_EMERGENCY_EXTRAS,
  EMERGENCY_EXTRA_LABELS,
  EMERGENCY_EXTRAS,
  type EmergencyExtra,
  type MedicalIdInfo,
} from "@talaan/shared";
import { Eye, QrCode as QrIcon } from "lucide-react-native";
import { PagePreview } from "../ui/PagePreview";
import { useState } from "react";
import { View } from "react-native";
import { WEB_URL } from "../config";
import { useTheme } from "../theme/ThemeProvider";
import { CheckRow, ConfirmBox } from "../ui/form";
import { Button, Card, ErrorNotice, Txt } from "../ui/kit";
import { QrCode } from "../ui/QrCode";

export const emergencyUrl = (token: string) => `${WEB_URL}/e/${token}`;

// The emergency QR: anyone who scans it sees the contacts (and only the
// extras chosen here), without signing in
export function EmergencyQrPanel({ medicalId }: { medicalId: MedicalIdInfo }) {
  const t = useTheme();
  const person = {
    ownerId: medicalId.ownerId,
    profileId: medicalId.profileId ?? "self",
  };
  const save = useSaveEmergency(person);
  const [renewing, setRenewing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { on, token } = medicalId.emergency;
  const saved = medicalId.emergency.extras;
  const [extras, setExtras] = useState(saved);
  const [seen, setSeen] = useState(saved);
  if (seen !== saved) {
    setSeen(saved);
    setExtras(saved);
  }
  const first = medicalId.personName.split(" ")[0];
  const toggle = (extra: EmergencyExtra, checked: boolean) => {
    const next = checked
      ? [...extras, extra]
      : extras.filter((e) => e !== extra);
    setExtras(next);
    save.mutate({ on, extras: next }, { onError: () => setExtras(saved) });
  };
  return (
    <Card>
      <PagePreview
        url={preview}
        title="What the emergency QR shows"
        onClose={() => setPreview(null)}
      />
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <QrIcon size={20} color={t.brand} />
        <Txt tone="heading">Emergency QR</Txt>
      </View>
      <Txt tone="small" muted>
        For the wallet card and lock screen. Anyone who scans it, without
        signing in, sees {first}'s emergency contacts with call buttons, and
        only what you tick below.
      </Txt>
      <ErrorNotice error={save.error} />
      {!on ? (
        <Button
          busy={save.isPending}
          onPress={() =>
            save.mutate({
              on: true,
              extras: token ? extras : DEFAULT_EMERGENCY_EXTRAS,
            })
          }
        >
          Turn on the emergency QR
        </Button>
      ) : (
        <>
          <Txt tone="label">Also show (the contacts always show)</Txt>
          {EMERGENCY_EXTRAS.map((extra) => (
            <CheckRow
              key={extra}
              label={EMERGENCY_EXTRA_LABELS[extra]}
              note={
                extra === "fullName"
                  ? "Otherwise the first name and an initial"
                  : undefined
              }
              value={extras.includes(extra)}
              onChange={(checked) => toggle(extra, checked)}
            />
          ))}
          {extras.includes("address") ? (
            <Txt tone="small" color={t.warn}>
              Anyone who finds the card or phone can read the address. It helps
              rescuers bring {first} home, but untick it if that worries you.
            </Txt>
          ) : null}
          {token ? (
            <View style={{ alignItems: "center", gap: 10 }}>
              <QrCode
                text={emergencyUrl(token)}
                size={200}
                label="Emergency QR code"
              />
              <Button
                kind="secondary"
                small
                icon={Eye}
                onPress={() => setPreview(emergencyUrl(token))}
              >
                See what it shows
              </Button>
              {renewing ? (
                <ConfirmBox
                  message="Make a new code? Cards and lock screens printed before stop working."
                  confirmLabel="Make a new code"
                  busy={save.isPending}
                  onConfirm={() =>
                    save.mutate(
                      { on, extras, newCode: true },
                      { onSettled: () => setRenewing(false) },
                    )
                  }
                  onCancel={() => setRenewing(false)}
                />
              ) : (
                <Button kind="link" small onPress={() => setRenewing(true)}>
                  Make a new code (if a card was lost)
                </Button>
              )}
            </View>
          ) : null}
          <Button
            kind="secondary"
            busy={save.isPending}
            onPress={() => save.mutate({ on: false, extras })}
          >
            Turn it off
          </Button>
          <Txt tone="tiny" muted>
            Turned off, the code shows nothing. Turned on again, the same
            printed code works again.
          </Txt>
        </>
      )}
    </Card>
  );
}
