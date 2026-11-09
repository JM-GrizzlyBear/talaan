import { SHARE_LIMITS } from "@talaan/shared";
import { CheckboxField } from "../../ui/CheckboxField";
import { TextField } from "../../ui/TextField";

// Optional: how many phones or computers may open it
export function MaxViewsField({
  on,
  value,
  onChange,
  error,
}: {
  on: boolean;
  value: string;
  onChange: (on: boolean, value: string) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <CheckboxField
        checked={on}
        onChange={(checked) => onChange(checked, value)}
      >
        <span className="font-semibold">
          Limit how many devices can open it
        </span>
        <span className="block text-muted">
          A device that opened it can keep looking until the link ends.
        </span>
      </CheckboxField>
      {on && (
        <div className="ml-8 w-32">
          <TextField
            label="Devices"
            type="number"
            inputMode="numeric"
            min={1}
            max={SHARE_LIMITS.maxViews}
            value={value}
            onChange={(v) => onChange(true, v)}
            error={error}
          />
        </div>
      )}
    </div>
  );
}
