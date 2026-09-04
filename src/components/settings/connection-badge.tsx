import { cn } from "@/lib/utils";

export function ConnectionBadge({
  connected,
  className,
}: {
  connected: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        connected
          ? "bg-[var(--ff-green-bg)] text-[var(--ff-green)]"
          : "bg-secondary text-muted-foreground",
        className,
      )}
    >
      {connected ? "Connected (stub)" : "Not connected"}
    </span>
  );
}
