import {
  AlignLeft,
  Calendar,
  CalendarClock,
  DollarSign,
  Hash,
  Image,
  Link,
  List,
  ListChecks,
  Mail,
  Percent,
  Phone,
  Rows3,
  Sigma,
  SquareCheck,
  Type,
  type LucideIcon,
} from "lucide-react";
import { FIELD_TYPE_ICON_NAMES } from "@/lib/custom-fields/icons";
import type { PaletteItem } from "@/lib/custom-fields/types";

const ICONS: Record<PaletteItem, LucideIcon> = {
  single_line: Type,
  multi_line: AlignLeft,
  email: Mail,
  phone: Phone,
  picklist: List,
  multi_select: ListChecks,
  date: Calendar,
  date_time: CalendarClock,
  number: Hash,
  currency: DollarSign,
  percentage: Percent,
  checkbox: SquareCheck,
  lookup: Link,
  formula: Sigma,
  image: Image,
  section: Rows3,
};

export function FieldTypeIcon({
  type,
  className = "size-3.5 shrink-0",
}: {
  type: PaletteItem;
  className?: string;
}) {
  const Icon = ICONS[type] ?? Type;
  return <Icon className={className} aria-hidden data-ff-type-icon={type} data-ff-icon-name={FIELD_TYPE_ICON_NAMES[type]} />;
}
