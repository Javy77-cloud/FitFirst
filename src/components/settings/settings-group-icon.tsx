import {
  ArrowLeftRight,
  BookOpen,
  Building2,
  Code2,
  CreditCard,
  Mail,
  Phone,
  Plug,
  Shield,
  TrendingUp,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { SettingsGroupIcon as IconId } from "@/lib/settings/nav";
import { cn } from "@/lib/utils";

const ICONS: Record<IconId, LucideIcon> = {
  agency: Building2,
  people: Users,
  phone: Phone,
  book: BookOpen,
  growth: TrendingUp,
  connect: Plug,
  automations: Workflow,
  developer: Code2,
  security: Shield,
  billing: CreditCard,
  "import-export": ArrowLeftRight,
  templates: Mail,
};

export function SettingsGroupIcon({
  name,
  className,
  tone = "default",
}: {
  name: IconId;
  className?: string;
  tone?: "default" | "navy" | "terracotta";
}) {
  const Icon = ICONS[name];
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md",
        tone === "navy" && "bg-navy text-white",
        tone === "terracotta" && "bg-[color:var(--ff-terracotta)] text-white",
        tone === "default" && "bg-navy/10 text-navy",
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
