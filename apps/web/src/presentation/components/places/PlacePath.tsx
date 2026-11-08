import type { PlaceStep } from "@talaan/shared";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";

// "Drawer › Blue box › Lola's folder", each one a link
export function PlacePath({
  path,
  className = "",
}: {
  path: PlaceStep[];
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {path.map((step, index) => (
        <span key={step.id} className="inline-flex items-center gap-1">
          {index > 0 && (
            <ChevronRight aria-label="inside" className="size-3.5 text-muted" />
          )}
          <Link
            to={`/places/${step.id}`}
            className="font-semibold text-brand underline-offset-2 hover:underline"
          >
            {step.name}
          </Link>
        </span>
      ))}
    </span>
  );
}
