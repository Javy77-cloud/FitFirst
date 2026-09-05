import { connectionStatusLabel } from "@/lib/integrations/catalog";
import { cn } from "@/lib/utils";

export { connectionStatusLabel };

export function ConnectionBadge({
  connected,
  className,
  label,
}: {
  connected: boolean;
  className?: string;
  label?: string;
}) {
  const text = label ?? connectionStatusLabel(connected);
  const positive = connected || text.toLowerCase().includes("connected");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        positive
          ? "bg-[var(--ff-green-bg)] text-[var(--ff-green)]"
          : "bg-secondary text-muted-foreground",
        className,
      )}
    >
      {text}
    </span>
  );
}
