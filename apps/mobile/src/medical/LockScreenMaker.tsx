import {
  DEFAULT_LOCK_SCREEN,
  lockScreenSections,
  type LockScreenOptions,
  PHONE_SIZES,
  type PhoneSize,
} from "@talaan/client";
import type { MedicalIdInfo } from "@talaan/shared";
import { Image } from "expo-image";
import { Download } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { ReaderFrame } from "../reader/ReaderFrame";
import type { BridgeMessage } from "../reader/readerTypes";
import { CheckRow, Select } from "../ui/form";
import { Button, ErrorNotice, Txt } from "../ui/kit";
import { emergencyUrl } from "./EmergencyQrPanel";
import { savePicture } from "./savePicture";

const INCLUDE: [keyof LockScreenOptions, string][] = [
  ["bloodType", "Blood type"],
  ["allergies", "Allergies"],
  ["conditions", "Conditions"],
  ["medicines", "Medicines"],
  ["contacts", "Emergency contacts"],
  ["address", "Home address"],
  ["philhealth", "PhilHealth ID"],
  ["fullName", "Full name (otherwise first name only)"],
];

// A picture to set as the phone's lock screen. It's drawn by the website's
// own drawing code, here on the phone (hidden), so it's the same picture.
export function LockScreenMaker({ medicalId }: { medicalId: MedicalIdInfo }) {
  const [options, setOptions] = useState(DEFAULT_LOCK_SCREEN);
  const [picture, setPicture] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const send = useRef<((json: string) => void) | null>(null);
  const ready = useRef(false);
  const id = useRef(0);
  const token = medicalId.emergency.token;
  const set = <K extends keyof LockScreenOptions>(
    key: K,
    value: LockScreenOptions[K],
  ) => setOptions((o) => ({ ...o, [key]: value }));

  const draw = useCallback(() => {
    if (!ready.current || !send.current) return;
    id.current += 1;
    const size = PHONE_SIZES[options.phone];
    const f = medicalId.fields;
    send.current(
      JSON.stringify({
        type: "lockscreen",
        id: id.current,
        picture: {
          ...size,
          dark: options.dark,
          name: options.fullName
            ? medicalId.personName
            : medicalId.personName.split(" ")[0],
          bloodType:
            options.bloodType && f.bloodType && f.bloodType !== "unknown"
              ? f.bloodType
              : "",
          sections: lockScreenSections(f, options),
          qrText: options.qr && token ? emergencyUrl(token) : null,
        },
      }),
    );
  }, [options, medicalId, token]);

  useEffect(draw, [draw]);

  const onMessage = useCallback(
    (message: BridgeMessage) => {
      if (message.type === "ready") {
        ready.current = true;
        draw();
      } else if (message.type === "drawn" && message.id === id.current) {
        setPicture(message.dataUrl);
      } else if (message.type === "failed" && message.id === -1) {
        setError(new Error(message.message));
      }
    },
    [draw],
  );
  const onSend = useCallback((fn: (json: string) => void) => {
    send.current = fn;
  }, []);

  const size = PHONE_SIZES[options.phone];
  return (
    <View style={{ gap: 12 }}>
      <ReaderFrame onMessage={onMessage} onSend={onSend} />
      <Select
        label="Phone"
        value={options.phone}
        onChange={(v) => set("phone", v as PhoneSize)}
        options={Object.entries(PHONE_SIZES).map(([value, p]) => ({
          value: value as PhoneSize,
          label: `${p.name} (${p.width} × ${p.height})`,
        }))}
      />
      <Select
        label="Look"
        value={options.dark ? "dark" : "light"}
        onChange={(v) => set("dark", v === "dark")}
        options={[
          { value: "dark", label: "Dark" },
          { value: "light", label: "Light" },
        ]}
      />
      <Txt tone="label">Show</Txt>
      {INCLUDE.map(([key, label]) => (
        <CheckRow
          key={key}
          label={label}
          value={options[key] as boolean}
          onChange={(v) => set(key, v as never)}
        />
      ))}
      <CheckRow
        label={`Emergency QR ${token ? "" : "(turn it on first, above)"}`}
        value={options.qr && Boolean(token)}
        onChange={(v) => set("qr", v)}
      />
      <Txt tone="small" muted>
        Anyone holding the phone can read the lock screen without unlocking it.
        Show only what you're fine with strangers seeing.
      </Txt>
      {picture ? (
        <Image
          source={{ uri: picture }}
          style={{
            width: "70%",
            alignSelf: "center",
            aspectRatio: size.width / size.height,
            borderRadius: 16,
          }}
          contentFit="contain"
          accessibilityLabel="Preview of the lock screen picture"
        />
      ) : (
        <Txt muted>Drawing the picture… (it needs internet the first time)</Txt>
      )}
      <ErrorNotice error={error} />
      <Button
        icon={Download}
        disabled={!picture}
        busy={saving}
        onPress={async () => {
          if (!picture) return;
          setSaving(true);
          setError(null);
          try {
            await savePicture(
              picture,
              `medical-id-${medicalId.personName.split(" ")[0].toLowerCase()}-lock-screen.png`,
            );
          } catch (e) {
            setError(e);
          } finally {
            setSaving(false);
          }
        }}
      >
        Save the picture
      </Button>
      <Txt tone="small" muted>
        Then set it as the lock screen wallpaper: on iPhone, Photos → Share →
        Use as Wallpaper; on Android, Gallery → Set as wallpaper → Lock screen.
      </Txt>
    </View>
  );
}
