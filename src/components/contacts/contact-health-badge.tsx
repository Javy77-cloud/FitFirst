import { contactHealthScore, type ContactHealth } from "@/lib/contacts/health-score";
import { cn } from "@/lib/utils";

const COLORS: Record<ContactHealth, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-[#BF0A30]",
};

export function ContactHealthBadge({
  policyCount,
  lastActivityAt,
}: {
  policyCount: number;
  lastActivityAt?: Date | string | null;
}) {
  const { level, tip } = contactHealthScore({ policyCount, lastActivityAt });
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={tip}
      data-ff-contact-health={level}
    >
      <span className={cn("size-2.5 rounded-full", COLORS[level])} aria-hidden />
      <span className="sr-only">{tip}</span>
    </span>
  );
}
