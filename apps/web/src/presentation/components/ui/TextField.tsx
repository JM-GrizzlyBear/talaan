import { useId, type ComponentProps } from "react";
import { inputBase } from "./styles";

type InputProps = Omit<ComponentProps<"input">, "id" | "onChange" | "value">;

// A labelled input with its error message underneath
export function TextField({
  label,
  value,
  onChange,
  error,
  ...input
}: InputProps & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        {...input}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${inputBase} h-11 ${error ? "border-danger" : "border-edge"}`}
      />
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
