import { useId, type ComponentProps } from "react";
import { inputBase } from "./styles";

type SelectProps = Omit<ComponentProps<"select">, "id" | "onChange" | "value">;

// A labelled dropdown with its error message underneath
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  ...select
}: SelectProps & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  // Shown first, with no value, until something is chosen
  placeholder?: string;
  error?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        {...select}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${inputBase} h-11 cursor-pointer ${error ? "border-danger" : "border-edge"}`}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
