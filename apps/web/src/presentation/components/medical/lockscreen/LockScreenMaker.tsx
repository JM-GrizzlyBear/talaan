import type { MedicalIdInfo } from "@talaan/shared";
import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CheckboxField } from "../../ui/CheckboxField";
import { SelectField } from "../../ui/SelectField";
import { buttonPrimary } from "../../ui/styles";
import { emergencyUrl } from "../emergencyUrl";
import { drawLockScreen } from "./drawLockScreen";
import {
  DEFAULT_LOCK_SCREEN,
  type LockScreenOptions,
  lockScreenSections,
  PHONE_SIZES,
  type PhoneSize,
} from "./lockScreenContent";

const INCLUDE: [keyof LockScreenOptions, string][] = [
  ["bloodType", "Blood type"],
  ["allergies", "Allergies"],
  ["conditions", "Conditions"],
  ["medicines", "Medicines"],
  ["contacts", "Emergency contacts"],
  ["philhealth", "PhilHealth ID"],
  ["fullName", "Full name (otherwise first name only)"],
];

// A picture to set as the phone's lock screen, made on this device
export function LockScreenMaker({ medicalId }: { medicalId: MedicalIdInfo }) {
  const [options, setOptions] = useState(DEFAULT_LOCK_SCREEN);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const token = medicalId.emergency.token;
  const set = <K extends keyof LockScreenOptions>(
    key: K,
    value: LockScreenOptions[K],
  ) => setOptions((o) => ({ ...o, [key]: value }));

  useEffect(() => {
    if (!canvasRef.current) return;
    const size = PHONE_SIZES[options.phone];
    const f = medicalId.fields;
    drawLockScreen(canvasRef.current, {
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
    });
  }, [options, medicalId, token]);

  function download() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `medical-id-${medicalId.personName.split(" ")[0].toLowerCase()}-lock-screen.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-4">
        <SelectField
          label="Phone"
          value={options.phone}
          onChange={(v) => set("phone", v as PhoneSize)}
          options={Object.entries(PHONE_SIZES).map(([value, p]) => ({
            value,
            label: `${p.name} (${p.width} × ${p.height})`,
          }))}
        />
        <SelectField
          label="Look"
          value={options.dark ? "dark" : "light"}
          onChange={(v) => set("dark", v === "dark")}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Show</legend>
          {INCLUDE.map(([key, label]) => (
            <CheckboxField
              key={key}
              checked={options[key] as boolean}
              onChange={(v) => set(key, v as never)}
            >
              {label}
            </CheckboxField>
          ))}
          <CheckboxField
            checked={options.qr && Boolean(token)}
            onChange={(v) => set("qr", v)}
          >
            Emergency QR {token ? "" : "(turn it on first, below)"}
          </CheckboxField>
        </fieldset>
        <p className="text-sm text-muted">
          Anyone holding the phone can read the lock screen without unlocking
          it. Show only what you're fine with strangers seeing.
        </p>
        <button
          type="button"
          onClick={download}
          className={`${buttonPrimary} self-start`}
        >
          <Download aria-hidden="true" className="size-4" />
          Download the picture
        </button>
        <p className="text-sm text-muted">
          Then set it as the lock screen wallpaper: on iPhone, Photos → Share →
          Use as Wallpaper; on Android, Gallery → Set as wallpaper → Lock
          screen.
        </p>
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Preview of the lock screen picture"
        className="w-48 justify-self-center rounded-2xl border border-edge shadow-md sm:w-56"
      />
    </div>
  );
}
