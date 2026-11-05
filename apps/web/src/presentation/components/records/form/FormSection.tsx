import type { ReactNode } from "react";

// A white box with a title, around one part of the form
export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border border-edge bg-white p-4">
      <legend className="px-1 font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}
