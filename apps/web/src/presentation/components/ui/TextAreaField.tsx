import { useId, type ComponentProps } from "react";
import { inputBase } from "./styles";

type TextAreaProps = Omit<
  ComponentProps<"textarea">,
  "id" | "onChange" | "value"
>;

// A labelled multi-line box (notes, readings) with its error underneath
export function TextAreaField({
  label,
  value,
  onChange,
  error,
  rows = 4,
  ...textarea
}: TextAreaProps & {
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
      <textarea
        {...textarea}
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${inputBase} py-2.5 ${error ? "border-danger" : "border-edge"}`}
      />
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
