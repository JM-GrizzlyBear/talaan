import type { PlaceKind } from "@talaan/shared";
import {
  Archive,
  Briefcase,
  Folder,
  Library,
  Mail,
  MapPin,
  Package,
  type LucideProps,
} from "lucide-react";

const ICONS = {
  folder: Folder,
  envelope: Mail,
  box: Package,
  drawer: Archive,
  cabinet: Library,
  bag: Briefcase,
  other: MapPin,
} satisfies Record<PlaceKind, unknown>;

export function PlaceKindIcon({
  kind,
  ...props
}: { kind: PlaceKind } & LucideProps) {
  const Icon = ICONS[kind];
  return <Icon aria-hidden="true" {...props} />;
}
