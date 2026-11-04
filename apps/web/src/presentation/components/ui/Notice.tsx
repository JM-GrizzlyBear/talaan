import type { ReactNode } from "react";

// A calm teal box for good news and next steps
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-lg bg-brand-soft px-3.5 py-2.5 text-sm font-medium text-deep"
    >
      {children}
    </p>
  );
}
