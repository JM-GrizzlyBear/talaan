import type { ReactNode } from "react";

// One of a few choices, as a big tappable card (a radio button inside)
export function ChoiceCard({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer flex-col gap-2 rounded-xl border-2 bg-white p-3 ${
        checked ? "border-brand" : "border-edge hover:border-gray-400"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {children}
    </label>
  );
}
