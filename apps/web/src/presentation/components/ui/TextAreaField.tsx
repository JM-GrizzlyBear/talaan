import { useId, type ComponentProps } from "react";
import { inputBase } from "./styles";

type TextAreaProps = Omit<
  ComponentProps<"textarea">,
  "id" | "onChange" | "value"
>;

export function TextAreaField({
  label,
  value,
  onChange,
  error,
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${inputBase} min-h-28 py-2.5 ${error ? "border-danger" : "border-edge"}`}
      />
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
