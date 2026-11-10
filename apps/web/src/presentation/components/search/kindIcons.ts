import type { SearchKind } from "@talaan/shared";
import {
  Bell,
  ChartLine,
  FileText,
  HeartPulse,
  type LucideIcon,
  Package,
  User,
} from "lucide-react";

export const KIND_ICONS: Record<SearchKind, LucideIcon> = {
  record: FileText,
  test: ChartLine,
  medical: HeartPulse,
  place: Package,
  reminder: Bell,
  person: User,
};
