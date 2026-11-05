import type { ReactNode } from "react";

// A small teal label, like "Anak" or "This browser"
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-deep">
      {children}
    </span>
  );
}
