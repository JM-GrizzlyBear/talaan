import { randomPin } from "@talaan/shared";
import { RefreshCw } from "lucide-react";
import { CheckboxField } from "../../ui/CheckboxField";
import { TextField } from "../../ui/TextField";
import { buttonSecondary } from "../../ui/styles";

// An optional 6-digit PIN the doctor types before seeing anything
export function PinChoice({
  on,
  pin,
  onChange,
  error,
  label = "Ask for a PIN",
}: {
  on: boolean;
  pin: string;
  onChange: (on: boolean, pin: string) => void;
  error?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <CheckboxField
        checked={on}
        onChange={(checked) => onChange(checked, pin || randomPin())}
      >
        <span className="font-semibold">{label}</span>
        <span className="block text-muted">
          Tell the PIN yourself (say it, or send it separately), so a forwarded
          link alone isn't enough.
        </span>
      </CheckboxField>
      {on && (
        <div className="flex items-end gap-2 pl-8">
          <div className="w-40">
            <TextField
              label="PIN (6 digits)"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(v) => onChange(true, v.replace(/\D/g, ""))}
              error={error}
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(true, randomPin())}
            className={buttonSecondary}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            New PIN
          </button>
        </div>
      )}
    </div>
  );
}
