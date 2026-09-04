import { cn } from "@/lib/utils";
import {
  daysUntil,
  expirationTone,
  expirationToneClass,
  formatIsoDate,
} from "@/lib/crm/display";

export function ExpirationBadge({
  date,
  asOf,
}: {
  date: Date;
  asOf?: Date;
}) {
  const days = daysUntil(date, asOf);
  const tone = expirationTone(days);
  const label =
    days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d`;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tabular-nums">{formatIsoDate(date)}</span>
      <span
        className={cn(
          "inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
          expirationToneClass(tone),
        )}
      >
        {label}
      </span>
    </span>
  );
}
