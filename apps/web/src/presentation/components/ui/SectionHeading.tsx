import type { ReactNode } from "react";

// A page section's title with a small teal icon
export function SectionHeading({
  id,
  icon,
  children,
}: {
  id: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-lg font-bold">
      <span aria-hidden="true" className="text-brand">
        {icon}
      </span>
      {children}
    </h2>
  );
}
