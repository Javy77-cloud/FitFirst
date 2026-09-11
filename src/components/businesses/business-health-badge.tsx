import { businessHealthScore, type BusinessHealth } from "@/lib/businesses/health-score";
import { cn } from "@/lib/utils";

const COLORS: Record<BusinessHealth, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-[#BF0A30]",
};

export function BusinessHealthBadge({
  activePolicyCount,
  policyCount,
  lastActivityAt,
}: {
  activePolicyCount: number;
  policyCount?: number;
  lastActivityAt?: Date | string | null;
}) {
  const { level, tip } = businessHealthScore({
    activePolicyCount,
    policyCount,
    lastActivityAt,
  });
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={tip}
      data-ff-business-health={level}
    >
      <span className={cn("size-2.5 rounded-full", COLORS[level])} aria-hidden />
      <span className="sr-only">{tip}</span>
    </span>
  );
}
