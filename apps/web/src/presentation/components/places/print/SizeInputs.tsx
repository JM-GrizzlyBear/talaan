import { TextField } from "../../ui/TextField";
import type { Size } from "./sizes";

// Width × height in millimetres, for a custom paper or label
export function SizeInputs({
  label,
  value,
  limits,
  onChange,
}: {
  label: string;
  value: Size;
  limits: { min: number; max: number };
  onChange: (size: Size) => void;
}) {
  const set = (key: keyof Size, text: string) => {
    const number = Number(text);
    if (Number.isFinite(number)) onChange({ ...value, [key]: number });
  };
  const problem = (n: number) =>
    n < limits.min || n > limits.max
      ? `${limits.min} to ${limits.max} mm`
      : undefined;
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextField
        label={`${label} width (mm)`}
        type="number"
        inputMode="decimal"
        value={String(value.width)}
        onChange={(v) => set("width", v)}
        error={problem(value.width)}
      />
      <TextField
        label={`${label} height (mm)`}
        type="number"
        inputMode="decimal"
        value={String(value.height)}
        onChange={(v) => set("height", v)}
        error={problem(value.height)}
      />
    </div>
  );
}
