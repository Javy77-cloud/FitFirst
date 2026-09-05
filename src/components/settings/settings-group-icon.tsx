import {
  ArrowLeftRight,
  Building2,
  Code2,
  CreditCard,
  Phone,
  Plug,
  Shield,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { SettingsGroupIcon as IconId } from "@/lib/settings/nav";
import { cn } from "@/lib/utils";

const ICONS: Record<IconId, LucideIcon> = {
  agency: Building2,
  phone: Phone,
  connect: Plug,
  automations: Workflow,
  developer: Code2,
  security: Shield,
  billing: CreditCard,
  "import-export": ArrowLeftRight,
};

export function SettingsGroupIcon({
  name,
  className,
}: {
  name: IconId;
  className?: string;
}) {
  const Icon = ICONS[name];
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-navy",
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
